const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

const authProviderSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ['local', 'google', 'github'],
    },
    providerId: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      default: null,
      minlength: [8, 'Password must be at least 8 characters'],
      maxlength: [128, 'Password cannot exceed 128 characters'],
      select: false,
    },
    authProviders: {
      type: [authProviderSchema],
      default: [],
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ 'authProviders.provider': 1, 'authProviders.providerId': 1 });
userSchema.index({ createdAt: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.password === null) {
    return next();
  }
  try {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.hasProvider = function (provider) {
  return this.authProviders.some((ap) => ap.provider === provider);
};

userSchema.methods.addProvider = function (provider, providerId, accessToken) {
  if (!this.hasProvider(provider)) {
    this.authProviders.push({ provider, providerId, accessToken });
  }
};

userSchema.methods.getProviderToken = function (provider) {
  const ap = this.authProviders.find((p) => p.provider === provider);
  return ap ? ap.accessToken : null;
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  if (obj.authProviders) {
    obj.authProviders = obj.authProviders.map((ap) => ({
      provider: ap.provider,
      providerId: ap.providerId,
    }));
  }
  return obj;
};

userSchema.statics.findByProvider = function (provider, providerId) {
  return this.findOne({
    authProviders: {
      $elemMatch: { provider, providerId },
    },
  });
};

userSchema.statics.createFromOAuth = async function (profile, provider, accessToken) {
  const providerId = profile.id;

  const existing = await this.findByProvider(provider, providerId);
  if (existing) {
    existing.authProviders.forEach((ap) => {
      if (ap.provider === provider) {
        ap.accessToken = accessToken;
      }
    });
    return existing.save();
  }

  if (profile.emails && profile.emails.length > 0) {
    const email = profile.emails[0].value.toLowerCase();
    const emailUser = await this.findOne({ email });
    if (emailUser) {
      emailUser.addProvider(provider, providerId, accessToken);
      if (profile.photos && profile.photos.length > 0) {
        emailUser.avatar = profile.photos[0].value;
      }
      return emailUser.save();
    }
  }

  const userData = {
    name: profile.displayName || profile.username || 'Unknown',
    email:
      profile.emails && profile.emails.length > 0
        ? profile.emails[0].value.toLowerCase()
        : `${providerId}@${provider}.placeholder`,
    password: null,
    authProviders: [{ provider, providerId, accessToken }],
    avatar:
      profile.photos && profile.photos.length > 0
        ? profile.photos[0].value
        : null,
  };

  return this.create(userData);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
