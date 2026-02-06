"""Evaluation service for document summarization quality metrics."""

from typing import Dict
import math


def calculate_rouge(generated: str, reference: str) -> Dict[str, float]:
    """Calculate ROUGE-1, ROUGE-2, and ROUGE-L F1 scores."""
    gen_tokens = generated.lower().split()
    ref_tokens = reference.lower().split()

    if not gen_tokens or not ref_tokens:
        return {"rouge_1": 0.0, "rouge_2": 0.0, "rouge_l": 0.0}

    # ROUGE-1 (unigram overlap)
    gen_set = set(gen_tokens)
    ref_set = set(ref_tokens)
    overlap = gen_set & ref_set
    precision = len(overlap) / len(gen_set) if gen_set else 0
    recall = len(overlap) / len(ref_set) if ref_set else 0
    rouge_1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

    # ROUGE-2 (bigram overlap)
    gen_bigrams = set(zip(gen_tokens[:-1], gen_tokens[1:])) if len(gen_tokens) > 1 else set()
    ref_bigrams = set(zip(ref_tokens[:-1], ref_tokens[1:])) if len(ref_tokens) > 1 else set()
    bi_overlap = gen_bigrams & ref_bigrams
    bi_precision = len(bi_overlap) / len(gen_bigrams) if gen_bigrams else 0
    bi_recall = len(bi_overlap) / len(ref_bigrams) if ref_bigrams else 0
    rouge_2 = 2 * bi_precision * bi_recall / (bi_precision + bi_recall) if (bi_precision + bi_recall) > 0 else 0

    # ROUGE-L (LCS-based)
    def lcs_length(x, y):
        m, n = len(x), len(y)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if x[i-1] == y[j-1]:
                    dp[i][j] = dp[i-1][j-1] + 1
                else:
                    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
        return dp[m][n]

    lcs = lcs_length(gen_tokens[:500], ref_tokens[:500])  # Limit for performance
    l_precision = lcs / len(gen_tokens) if gen_tokens else 0
    l_recall = lcs / len(ref_tokens) if ref_tokens else 0
    rouge_l = 2 * l_precision * l_recall / (l_precision + l_recall) if (l_precision + l_recall) > 0 else 0

    return {"rouge_1": round(rouge_1, 4), "rouge_2": round(rouge_2, 4), "rouge_l": round(rouge_l, 4)}


def calculate_bleu(generated: str, reference: str) -> float:
    """Calculate BLEU score (simplified unigram + bigram)."""
    gen_tokens = generated.lower().split()
    ref_tokens = reference.lower().split()

    if not gen_tokens or not ref_tokens:
        return 0.0

    # Unigram precision
    ref_counts: Dict[str, int] = {}
    for t in ref_tokens:
        ref_counts[t] = ref_counts.get(t, 0) + 1

    clipped = 0
    for t in gen_tokens:
        if ref_counts.get(t, 0) > 0:
            clipped += 1
            ref_counts[t] -= 1

    p1 = clipped / len(gen_tokens) if gen_tokens else 0

    # Bigram precision
    gen_bi = list(zip(gen_tokens[:-1], gen_tokens[1:])) if len(gen_tokens) > 1 else []
    ref_bi = list(zip(ref_tokens[:-1], ref_tokens[1:])) if len(ref_tokens) > 1 else []

    ref_bi_counts: Dict[tuple, int] = {}
    for b in ref_bi:
        ref_bi_counts[b] = ref_bi_counts.get(b, 0) + 1

    bi_clipped = 0
    for b in gen_bi:
        if ref_bi_counts.get(b, 0) > 0:
            bi_clipped += 1
            ref_bi_counts[b] -= 1

    p2 = bi_clipped / len(gen_bi) if gen_bi else 0

    # Brevity penalty
    bp = math.exp(1 - len(ref_tokens) / len(gen_tokens)) if len(gen_tokens) < len(ref_tokens) else 1.0

    # Geometric mean of precisions
    if p1 > 0 and p2 > 0:
        score = bp * math.exp(0.5 * math.log(p1) + 0.5 * math.log(p2))
    elif p1 > 0:
        score = bp * p1 * 0.5
    else:
        score = 0.0

    return round(score, 4)


def calculate_similarity(embedding1: list, embedding2: list) -> float:
    """Calculate cosine similarity between two embedding vectors."""
    if not embedding1 or not embedding2 or len(embedding1) != len(embedding2):
        return 0.0

    dot = sum(a * b for a, b in zip(embedding1, embedding2))
    norm1 = math.sqrt(sum(a * a for a in embedding1))
    norm2 = math.sqrt(sum(b * b for b in embedding2))

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return round(dot / (norm1 * norm2), 4)
