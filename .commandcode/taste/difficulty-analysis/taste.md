# difficulty-analysis
- Use XGBoost (not linear regression) for project difficulty scoring. Confidence: 0.70
- When adding features like notes or chat to the analysis page, use a button that opens an overlay/modal rather than adding a new permanent section. Confidence: 0.65
- User notes taken on the analysis page should persist with the code report (store alongside analysis results). Confidence: 0.65
- Difficulty analysis output should only show the score and level — do not expose model details, internal formulas, complexity distributions, or tech stack breakdown to the user. Confidence: 0.65
- Train the difficulty model using a semi-supervised pipeline: download GitHub projects → extract software metrics → use DeepSeek LLM to rate each project 1-10 → train XGBoost on the labeled features. Confidence: 0.65
- Deploy the trained model as a Python child process: Express → child_process.spawn() → predict.py loads model.pkl → return prediction. Confidence: 0.60
- In detailed analysis output, show recommended skills to learn instead of project purpose — project purpose is redundant. Confidence: 0.70
