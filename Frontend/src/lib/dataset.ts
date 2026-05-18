import { ExperimentConfig } from '../types';

export interface CRPSample {
  index: number;
  challenge: number[];
  response: number;
  hammingWeight: number;
}

export interface DatasetAnalysis {
  samples: CRPSample[];
  zeroCount: number;
  oneCount: number;
  totalSamples: number;
  bias: number; // 0.0 to 1.0 (ideally 0.5)
  entropy: number; // 0.0 to 1.0 (ideally 1.0)
  avgHammingWeight: number; // Avg 1s in challenge
  diversityScore: number; // 0.0 to 1.0
  observations: string[];
}

// XORShift32 PRNG for higher quality random distribution
function xorshift32(seed: number) {
  let state = seed ? seed : 0xBADF00D;
  return function() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    // Return float between 0 and 1
    return (state >>> 0) / 0xFFFFFFFF;
  };
}

export function generateSimulatedDataset(config: ExperimentConfig, previewCount: number = 100): DatasetAnalysis {
  const rng = xorshift32(config.seed);
  
  const samples: CRPSample[] = [];
  let zeroCount = 0;
  let oneCount = 0;
  let totalHamming = 0;

  // We simulate up to 2000 to get a good statistical spread, but only return previewCount for UI
  const statCount = Math.min(config.num_samples, 2000); 
  
  // To calculate diversity (uniqueness), we'll track a simplified hash of the first few hundred challenges
  const uniqueChallenges = new Set<string>();

  for (let i = 0; i < statCount; i++) {
    // Generate challenge vector
    const challenge: number[] = [];
    let hw = 0;
    for (let j = 0; j < config.n_stages; j++) {
      const bit = rng() > 0.5 ? 1 : 0;
      challenge.push(bit);
      hw += bit;
    }
    totalHamming += hw;
    
    if (i < 500) uniqueChallenges.add(challenge.slice(0, 16).join(''));

    // Deterministically simulate a response (simplified XOR PUF model with noise)
    // We create a pseudo-delay sum based on the challenge
    let delaySum = 0;
    for (let j = 0; j < config.n_stages; j++) {
      delaySum += (challenge[j] === 1 ? 1 : -1) * (rng() - 0.5);
    }
    
    // XOR level increases complexity. We just sample multiple pseudo-delays
    let parity = 0;
    for (let k = 0; k < config.xor_level; k++) {
      let kDelay = delaySum + (rng() - 0.5) * 5; // Variation per chain
      parity ^= (kDelay > 0 ? 1 : 0);
    }

    // Apply noise
    let response = parity;
    if (rng() < config.noise / 2) {
      response = response === 1 ? 0 : 1; // Flip bit
    }

    if (response === 0) zeroCount++;
    else oneCount++;

    if (i < previewCount) {
      samples.push({
        index: i + 1,
        challenge,
        response,
        hammingWeight: hw
      });
    }
  }

  const bias = oneCount / statCount;
  const avgHammingWeight = totalHamming / statCount;
  
  // Calculate Diversity Score (collision check on first 500 samples)
  const trackedSamples = Math.min(statCount, 500);
  const diversityScore = uniqueChallenges.size / trackedSamples;
  
  // Calculate Shannon Entropy: -p(0)*log2(p(0)) - p(1)*log2(p(1))
  const p0 = zeroCount / statCount;
  const p1 = oneCount / statCount;
  let entropy = 0;
  if (p0 > 0) entropy -= p0 * Math.log2(p0);
  if (p1 > 0) entropy -= p1 * Math.log2(p1);

  // Generate Observations
  const observations: string[] = [];
  
  if (entropy > 0.98) {
    observations.push("High Shannon Entropy indicates excellent dataset unpredictability.");
  } else if (entropy > 0.90) {
    observations.push("Moderate entropy observed. Responses are reasonably unpredictable.");
  } else {
    observations.push("WARNING: Low entropy detected. The PUF exhibits strong bias and is highly predictable.");
  }

  if (Math.abs(bias - 0.5) < 0.05) {
    observations.push("Response distribution is balanced, preventing simple statistical frequency attacks.");
  } else {
    const dominant = bias > 0.5 ? '1s' : '0s';
    observations.push(`Dataset is skewed towards ${dominant} (${(Math.max(bias, 1-bias)*100).toFixed(1)}%). This reduces the effective search space for attackers.`);
  }

  if (config.noise > 0.15) {
    observations.push(`High noise level (σ=${config.noise}) introduces significant bit-flips, degrading CRP reliability for legitimate authentication.`);
  }

  if (config.xor_level > 4) {
    observations.push(`Deep XOR chaining (k=${config.xor_level}) ensures high cryptographic complexity, though it may exacerbate noise-induced errors.`);
  }

  return {
    samples,
    zeroCount,
    oneCount,
    totalSamples: statCount,
    bias,
    entropy,
    avgHammingWeight,
    diversityScore,
    observations
  };
}

export function exportDatasetCSV(config: ExperimentConfig, analysis: DatasetAnalysis): string {
  let csv = 'Index,Challenge,Response\n';
  analysis.samples.forEach(s => {
    csv += `${s.index},${s.challenge.join('')},${s.response}\n`;
  });
  return csv;
}

export function exportDatasetJSON(config: ExperimentConfig, analysis: DatasetAnalysis): string {
  const payload = {
    metadata: {
      generator: "PUF Simulation Dashboard",
      timestamp: new Date().toISOString(),
      config: {
        n_stages: config.n_stages,
        xor_level: config.xor_level,
        noise: config.noise,
        seed: config.seed,
        model_type: config.model_type
      },
      metrics: {
        entropy: analysis.entropy,
        bias: analysis.bias,
        diversityScore: analysis.diversityScore,
        avgHammingWeight: analysis.avgHammingWeight
      }
    },
    dataset: analysis.samples.map(s => ({
      i: s.index,
      c: s.challenge.join(''),
      r: s.response
    }))
  };
  return JSON.stringify(payload, null, 2);
}
