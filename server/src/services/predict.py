import sys
import json
import pickle
import numpy as np
import os
from datetime import datetime

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'difficulty_model.pkl')
FEATURES_PATH = os.path.join(MODEL_DIR, 'difficulty_features.json')

COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444']
DESCRIPTIONS = [
    'Small, simple codebase. Few files and functions. Accessible to new developers.',
    'Moderate complexity. Requires framework knowledge and pattern understanding.',
    'Complex architecture with deep dependencies. Requires significant experience.',
    'Enterprise-grade complexity. Large codebase, heavy infrastructure, deep domain logic.',
]

# Learning time estimates in hours per level
LEARNING_TIME = {
    0: {'range': '2–8 hours', 'min': 2, 'max': 8, 'avg': 5, 'label': 'Hours'},
    1: {'range': '8–40 hours', 'min': 8, 'max': 40, 'avg': 24, 'label': 'Days'},
    2: {'range': '40–160 hours', 'min': 40, 'max': 160, 'avg': 100, 'label': 'Weeks'},
    3: {'range': '160–500+ hours', 'min': 160, 'max': 500, 'avg': 300, 'label': 'Months'},
}

# Skill level mapping
SKILL_LEVELS = {
    0: {'level': 'Beginner', 'description': 'New to programming. Basic syntax and logic.', 'years': '< 1 year'},
    1: {'level': 'Intermediate', 'description': 'Comfortable with frameworks and patterns.', 'years': '1–3 years'},
    2: {'level': 'Advanced', 'description': 'Deep understanding of architecture and design.', 'years': '3–6 years'},
    3: {'level': 'Expert', 'description': 'Enterprise-scale system design and optimization.', 'years': '6+ years'},
}

model = None
feature_order = None
feature_ranges = None
labels = None


def load_model():
    global model, feature_order, feature_ranges, labels
    if model is not None:
        return

    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)

    with open(FEATURES_PATH, 'r') as f:
        config = json.load(f)
        feature_order = config['featureOrder']
        feature_ranges = {k: tuple(v) for k, v in config['featureRanges'].items()}
        labels = config['labels']


def normalize(val, vmin, vmax):
    clamped = max(vmin, min(vmax, val))
    return (clamped - vmin) / (vmax - vmin) if vmax > vmin else 0.0


def predict(features_dict):
    load_model()

    row = []
    for fname in feature_order:
        val = features_dict.get(fname, 0)
        vmin, vmax = feature_ranges.get(fname, (0, 1))
        row.append(normalize(val, vmin, vmax))

    X = np.array([row])
    proba = model.predict_proba(X)[0]
    pred_class = int(np.argmax(proba))
    confidence = float(round(proba[pred_class], 3))

    # Difficulty score: 1-10 scale, continuous
    # Base: class * 2.5 + confidence boost, clamped to [1, 10]
    base_score = (pred_class + 1) * 2.5
    confidence_boost = confidence * 1.5
    score = round(min(10.0, max(1.0, base_score + confidence_boost)), 1)

    # Learning time
    lt = LEARNING_TIME.get(pred_class, LEARNING_TIME[0])
    # Adjust learning time based on specific features
    loc_factor = min(1.0, (features_dict.get('totalLOC', 0) / 10000))
    cc_factor = min(1.0, (features_dict.get('avgCC', 0) / 15))
    factor = (loc_factor + cc_factor) / 2
    adjusted_hours = lt['min'] + (lt['max'] - lt['min']) * factor
    estimated_hours = round(adjusted_hours)

    # Skill level
    sk = SKILL_LEVELS.get(pred_class, SKILL_LEVELS[0])

    # Dimension scores (0-10) for the radar/gauge display
    loc_raw = features_dict.get('totalLOC', 0)
    file_raw = features_dict.get('fileCount', 0)
    avgcc = features_dict.get('avgCC', 0)
    maxcc = features_dict.get('maxCC', 0)
    depth = features_dict.get('folderDepth', 0)
    deps = features_dict.get('depChainLength', 0)
    circ = features_dict.get('circularDepCount', 0)
    routes = features_dict.get('routeCount', 0)
    asyncn = features_dict.get('asyncCount', 0)
    classes = features_dict.get('classCount', 0)
    funcs = features_dict.get('totalFuncs', 0)
    maint = features_dict.get('maintainability', 100)
    comment = features_dict.get('commentPercent', 0)

    size_score = min(10, max(1, (loc_raw / 1000) * 0.5 + (file_raw / 50) * 2.5))
    complexity_score = min(10, max(1, avgcc * 0.5 + maxcc * 0.1))
    arch_score = min(10, max(1, depth * 0.8 + deps * 0.3 + circ * 0.4))
    surface_score = min(10, max(1, (routes / 40) * 2 + (asyncn / 80) * 2 + (classes / 20) * 2))
    quality_score = min(10, max(1, (100 - maint) * 0.08 + max(0, 30 - comment) * 0.05))

    return {
        'score': float(score),
        'level': labels[pred_class],
        'color': COLORS[pred_class],
        'description': DESCRIPTIONS[pred_class],
        'confidence': confidence,
        'probabilities': [float(round(p, 3)) for p in proba],
        'estimatedLearningTime': {
            'hours': estimated_hours,
            'range': lt['range'],
            'label': lt['label'],
            'dispersion': lt['range'],
        },
        'recommendedSkillLevel': {
            'level': sk['level'],
            'description': sk['description'],
            'years': sk['years'],
        },
        'dimensions': {
            'size': float(round(size_score, 1)),
            'complexity': float(round(complexity_score, 1)),
            'architecture': float(round(arch_score, 1)),
            'surface': float(round(surface_score, 1)),
            'quality': float(round(quality_score, 1)),
        },
    }


def main():
    try:
        input_data = json.loads(sys.stdin.read())
        result = predict(input_data)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}))


if __name__ == '__main__':
    main()
