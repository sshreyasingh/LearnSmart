import numpy as np
import xgboost as xgb
import json
import os
import pickle
from sklearn.model_selection import train_test_split
from datetime import datetime

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'ml-service', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'difficulty_model.pkl')
FEATURES_PATH = os.path.join(MODEL_DIR, 'difficulty_features.json')

FEATURE_RANGES = {
    'totalLOC': [0, 50000],
    'fileCount': [0, 500],
    'avgCC': [0, 30],
    'maxCC': [0, 80],
    'totalFuncs': [0, 600],
    'folderDepth': [0, 12],
    'depChainLength': [0, 15],
    'circularDepCount': [0, 25],
    'routeCount': [0, 400],
    'asyncCount': [0, 800],
    'classCount': [0, 200],
    'errorHandlerCount': [0, 300],
    'maintainability': [0, 100],
    'commentPercent': [0, 50],
}

FEATURE_ORDER = list(FEATURE_RANGES.keys())

def normalize(val, vmin, vmax):
    clamped = max(vmin, min(vmax, val))
    return (clamped - vmin) / (vmax - vmin) if vmax > vmin else 0.0


def generate_sample(loc, files, avgcc, maxcc, funcs, depth, deps, circ, routes, asyncn, classes, errh, maint, comment, label):
    return {
        'totalLOC': loc,
        'fileCount': files,
        'avgCC': avgcc,
        'maxCC': maxcc,
        'totalFuncs': funcs,
        'folderDepth': depth,
        'depChainLength': deps,
        'circularDepCount': circ,
        'routeCount': routes,
        'asyncCount': asyncn,
        'classCount': classes,
        'errorHandlerCount': errh,
        'maintainability': maint,
        'commentPercent': comment,
        'label': label,
    }


def generate_dataset():
    import random
    random.seed(42)
    np.random.seed(42)

    samples = []

    # Beginner projects (label 0): small, simple, flat
    for _ in range(300):
        loc = random.randint(10, 150)
        files = random.randint(1, 12)
        samples.append(generate_sample(
            loc, files,
            round(random.uniform(1.0, 4.5), 2),
            random.randint(2, 9),
            random.randint(2, 15),
            random.randint(1, 3),
            random.randint(1, 3),
            random.randint(0, 1),
            random.randint(0, 6),
            random.randint(0, 12),
            random.randint(0, 3),
            random.randint(2, 20),
            round(random.uniform(75, 100), 1),
            round(random.uniform(2, 25), 1),
            0
        ))

    # Intermediate projects (label 1): moderate everything
    for _ in range(300):
        loc = random.randint(100, 1000)
        files = random.randint(8, 40)
        samples.append(generate_sample(
            loc, files,
            round(random.uniform(3.0, 9.0), 2),
            random.randint(7, 24),
            random.randint(12, 60),
            random.randint(2, 6),
            random.randint(2, 6),
            random.randint(0, 4),
            random.randint(5, 40),
            random.randint(10, 60),
            random.randint(2, 15),
            random.randint(15, 80),
            round(random.uniform(45, 80), 1),
            round(random.uniform(5, 30), 1),
            1
        ))

    # Advanced projects (label 2): large, complex, deep
    for _ in range(300):
        loc = random.randint(600, 15000)
        files = random.randint(25, 250)
        samples.append(generate_sample(
            loc, files,
            round(random.uniform(7.0, 20.0), 2),
            random.randint(18, 60),
            random.randint(50, 300),
            random.randint(4, 9),
            random.randint(4, 10),
            random.randint(0, 10),
            random.randint(30, 200),
            random.randint(50, 300),
            random.randint(10, 60),
            random.randint(60, 250),
            round(random.uniform(20, 55), 1),
            round(random.uniform(4, 35), 1),
            2
        ))

    # Expert projects (label 3): enterprise scale
    for _ in range(200):
        loc = random.randint(8000, 50000)
        files = random.randint(100, 500)
        samples.append(generate_sample(
            loc, files,
            round(random.uniform(12.0, 30.0), 2),
            random.randint(35, 80),
            random.randint(200, 600),
            random.randint(7, 12),
            random.randint(7, 15),
            random.randint(2, 25),
            random.randint(150, 400),
            random.randint(200, 800),
            random.randint(40, 200),
            random.randint(200, 300),
            round(random.uniform(8, 40), 1),
            round(random.uniform(2, 30), 1),
            3
        ))

    random.shuffle(samples)
    print(f"Generated {len(samples)} training samples")
    return samples


def train():
    print("=" * 60)
    print("  XGBoost Difficulty Model Trainer")
    print("=" * 60)
    print()

    print("Generating training dataset...")
    dataset = generate_dataset()

    X_raw = []
    y = []
    for s in dataset:
        row = [s[f] for f in FEATURE_ORDER]
        X_raw.append(row)
        y.append(s['label'])

    X_norm = []
    for row in X_raw:
        norm_row = []
        for i, (fname, (vmin, vmax)) in enumerate(FEATURE_RANGES.items()):
            norm_row.append(normalize(row[i], vmin, vmax))
        X_norm.append(norm_row)

    X = np.array(X_norm)
    y = np.array(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    print(f"Training on {len(X_train)} samples, testing on {len(X_test)}...")
    print()

    model = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        objective='multi:softprob',
        num_class=4,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=2,
        gamma=0.1,
        reg_alpha=0.1,
        reg_lambda=1.0,
        random_state=42,
        verbosity=1,
        eval_metric='mlogloss',
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train), (X_test, y_test)],
        verbose=False
    )

    train_acc = model.score(X_train, y_train)
    test_acc = model.score(X_test, y_test)

    print()
    print(f"  Train accuracy: {train_acc:.2%}")
    print(f"  Test accuracy:  {test_acc:.2%}")
    print()

    # Feature importance
    importance = model.feature_importances_
    ranked = sorted(zip(FEATURE_ORDER, importance), key=lambda x: x[1], reverse=True)
    print("  Feature importance:")
    for name, imp in ranked:
        bar = '#' * int(imp * 50)
        print(f"    {name:20s}: {imp:.4f}  {bar}")
    print()

    # Per-class metrics
    y_pred = model.predict(X_test)
    from sklearn.metrics import classification_report
    report = classification_report(y_test, y_pred, target_names=['Beginner', 'Intermediate', 'Advanced', 'Expert'])
    print("  Classification Report:")
    for line in report.split('\n'):
        print(f"    {line}")
    print()

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    with open(FEATURES_PATH, 'w') as f:
        json.dump({
            'featureOrder': FEATURE_ORDER,
            'featureRanges': {k: list(v) for k, v in FEATURE_RANGES.items()},
            'labels': ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
            'trainAccuracy': round(train_acc, 4),
            'testAccuracy': round(test_acc, 4),
            'trainedAt': datetime.now().isoformat(),
            'numClasses': 4,
            'nEstimators': 150,
            'maxDepth': 6,
            'learningRate': 0.08,
        }, f, indent=2)

    print(f"  Model saved to      {MODEL_PATH}")
    print(f"  Feature config saved to {FEATURES_PATH}")
    print()
    print("=" * 60)
    print("  Training complete!")
    print("=" * 60)


if __name__ == '__main__':
    train()
