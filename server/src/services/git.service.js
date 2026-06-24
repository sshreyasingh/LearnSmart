const { exec, spawn } = require('child_process');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const https = require('https');
const { env } = require('../config/env');
const AppError = require('../utils/AppError');

const CLONE_TIMEOUT = 300000;

const sanitizeUrl = (url) => url.replace(/[`|;!$&(){}\[\]<>*\n\r']/g, '');

const execAsync = (command, options = {}) => {
  return new Promise((resolve, reject) => {
    exec(command, { timeout: CLONE_TIMEOUT, ...options }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
        return;
      }
      resolve(stdout.trim());
    });
  });
};

const execSpawnAsync = (command, onProgress) => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      if (onProgress) {
        const match = text.match(/Receiving objects:\s+(\d+)%/);
        if (match) onProgress({ phase: 'cloning', progress: parseInt(match[1], 10) });
      }
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      if (onProgress) {
        const match = text.match(/Receiving objects:\s+(\d+)%/);
        if (match) onProgress({ phase: 'cloning', progress: parseInt(match[1], 10) });
      }
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Clone failed with exit code ${code}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.on('error', reject);

    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error('Clone timed out after 5 minutes'));
    }, CLONE_TIMEOUT);

    proc.on('close', () => clearTimeout(timeout));
  });
};

const downloadFile = (url, destPath, timeoutMs = 60000) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      file.close();
      fs.unlink(destPath, () => {});
      reject(new Error(`Download timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    https
      .get(url, (response) => {
        if (timedOut) return;
        if (response.statusCode === 302 || response.statusCode === 301) {
          file.close();
          fs.unlink(destPath, () => {});
          downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          file.close();
          fs.unlink(destPath, () => {});
          reject(new Error(`Download failed with status ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => {
          clearTimeout(timer);
          file.close(resolve);
        });
      })
      .on('error', (err) => {
        clearTimeout(timer);
        file.close();
        fs.unlink(destPath, () => {});
        reject(err);
      });
  });
};

const parseRepoUrl = (url) => {
  const cleanUrl = url.trim().replace(/\/$/, '').replace(/\.git$/, '');

  const githubMatch = cleanUrl.match(/github\.com\/([^\/]+)\/([^\/]+?)(?:\/|$)/);
  if (githubMatch) {
    return {
      provider: 'github',
      owner: githubMatch[1],
      repo: githubMatch[2],
      cloneUrl: `https://github.com/${githubMatch[1]}/${githubMatch[2]}.git`,
    };
  }

  const gitlabMatch = cleanUrl.match(/gitlab\.com\/([^\/]+)\/([^\/]+?)(?:\/|$)/);
  if (gitlabMatch) {
    return {
      provider: 'gitlab',
      owner: gitlabMatch[1],
      repo: gitlabMatch[2],
      cloneUrl: `https://gitlab.com/${gitlabMatch[1]}/${gitlabMatch[2]}.git`,
    };
  }

  const bitbucketMatch = cleanUrl.match(/bitbucket\.org\/([^\/]+)\/([^\/]+?)(?:\/|$)/);
  if (bitbucketMatch) {
    return {
      provider: 'bitbucket',
      owner: bitbucketMatch[1],
      repo: bitbucketMatch[2],
      cloneUrl: `https://bitbucket.org/${bitbucketMatch[1]}/${bitbucketMatch[2]}.git`,
    };
  }

  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    const urlObj = new URL(cleanUrl);
    const parts = urlObj.pathname.split('/').filter(Boolean);
    return {
      provider: 'other',
      owner: parts[0] || 'unknown',
      repo: parts[1] || 'unknown',
      cloneUrl: cleanUrl + (cleanUrl.endsWith('.git') ? '' : '.git'),
    };
  }

  return null;
};

const cloneRepo = async (repoUrl, targetDir, onProgress) => {
  await fsp.mkdir(targetDir, { recursive: true });

  const result = parseRepoUrl(repoUrl);
  const cloneUrl = result ? result.cloneUrl : repoUrl;
  const safeUrl = sanitizeUrl(cloneUrl);
  const safeDir = sanitizeUrl(targetDir);

  const cmd = `git clone --depth 1 --single-branch --no-tags "${safeUrl}" "${safeDir}"`;

  try {
    if (onProgress) {
      await execSpawnAsync(cmd, onProgress);
    } else {
      await execAsync(cmd);
    }
  } catch (err) {
    throw new AppError(`Failed to clone repository: ${err.message}`, 400, 'CLONE_FAILED');
  }

  return result || { provider: 'other', owner: '', repo: path.basename(repoUrl, '.git') };
};

const cloneFromGitHub = async (owner, repo, targetDir, accessToken, onProgress) => {
  await fsp.mkdir(targetDir, { recursive: true });

  const safeOwner = sanitizeUrl(owner);
  const safeRepo = sanitizeUrl(repo);
  const safeDir = sanitizeUrl(targetDir);

  const cloneUrl = accessToken
    ? `https://${sanitizeUrl(accessToken)}@github.com/${safeOwner}/${safeRepo}.git`
    : `https://github.com/${safeOwner}/${safeRepo}.git`;

  const cmd = `git clone --depth 1 --single-branch --no-tags "${cloneUrl}" "${safeDir}"`;

  try {
    if (onProgress) {
      await execSpawnAsync(cmd, onProgress);
    } else {
      await execAsync(cmd);
    }
  } catch (err) {
    throw new AppError(`Failed to clone GitHub repository: ${err.message}`, 400, 'CLONE_FAILED');
  }

  return { provider: 'github', owner, repo };
};

const downloadRepoZip = async (repoUrl, targetDir) => {
  await fsp.mkdir(targetDir, { recursive: true });

  const result = parseRepoUrl(repoUrl);
  if (!result) {
    return cloneRepo(repoUrl, targetDir);
  }

  let zipUrl;
  switch (result.provider) {
    case 'github':
      zipUrl = `https://api.github.com/repos/${result.owner}/${result.repo}/zipball`;
      break;
    case 'gitlab':
      zipUrl = `https://gitlab.com/${result.owner}/${result.repo}/-/archive/main/${result.repo}-main.zip`;
      break;
    default:
      return cloneRepo(repoUrl, targetDir);
  }

  const zipPath = path.join(targetDir, 'repo.zip');

  try {
    await downloadFile(zipUrl, zipPath);
    return result || { provider: 'other', owner: '', repo: path.basename(repoUrl, '.git') };
  } catch {
    return cloneRepo(repoUrl, targetDir);
  }
};

const fetchGitHubRepos = (accessToken, page = 1) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/user/repos?per_page=30&page=${page}&sort=updated&type=all`,
      method: 'GET',
      headers: {
        'User-Agent': 'LearnSmart',
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const repos = JSON.parse(data);
          if (Array.isArray(repos)) {
            resolve(
              repos.map((r) => ({
                id: r.id,
                name: r.name,
                fullName: r.full_name,
                description: r.description || '',
                language: r.language || 'Unknown',
                stars: r.stargazers_count,
                forks: r.forks_count,
                updatedAt: r.updated_at,
                private: r.private,
                url: r.clone_url,
              }))
            );
          } else {
            reject(new Error(repos.message || 'Failed to fetch repos'));
          }
        } catch {
          reject(new Error('Failed to parse GitHub response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
};

const fileCountInDir = async (dirPath) => {
  let count = 0;
  const stack = [dirPath];
  const IGNORED = new Set([
    'node_modules', '.git', '.svn', 'dist', 'build', '__pycache__', '.next',
  ]);

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED.has(entry.name)) {
        stack.push(path.join(current, entry.name));
      } else if (entry.isFile()) {
        count++;
      }
    }
  }

  return count;
};

const removeDir = async (dirPath) => {
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch {}
};

module.exports = {
  cloneRepo,
  cloneFromGitHub,
  downloadRepoZip,
  fetchGitHubRepos,
  parseRepoUrl,
  removeDir,
  fileCountInDir,
};
