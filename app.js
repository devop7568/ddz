const promptInput = document.getElementById('prompt-input');
const scanBtn = document.getElementById('scan-btn');
const scanResult = document.getElementById('scan-result');
const signalList = document.getElementById('signal-list');

const highRiskPatterns = [
  /ignore (all|previous) instructions/i,
  /reveal (your|the) (system|hidden) prompt/i,
  /bypass|jailbreak|override|developer mode/i,
  /act as root|root access/i,
  /exfiltrate|export secrets|api key/i
];

const mediumRiskPatterns = [
  /pretend|roleplay/i,
  /simulate policy bypass/i,
  /do not follow safety/i,
  /disable guardrails/i
];

function evaluatePromptRisk(text) {
  const normalized = text.trim();
  if (!normalized) {
    return { score: 0, label: 'No input', signals: ['Add a prompt to analyze.'] };
  }

  const signals = [];
  let score = 6;

  highRiskPatterns.forEach((pattern) => {
    if (pattern.test(normalized)) {
      score += 18;
      signals.push(`High-risk phrase matched: ${pattern}`);
    }
  });

  mediumRiskPatterns.forEach((pattern) => {
    if (pattern.test(normalized)) {
      score += 9;
      signals.push(`Medium-risk phrase matched: ${pattern}`);
    }
  });

  if (normalized.length > 350) {
    score += 6;
    signals.push('Long prompt may contain obfuscated intent.');
  }

  if (/\b(base64|hex|unicode)\b/i.test(normalized)) {
    score += 10;
    signals.push('Encoding terms detected.');
  }

  score = Math.min(100, score);
  const threshold = 65;
  const label = score >= threshold ? 'Risky prompt' : 'Likely safe';

  if (signals.length === 0) {
    signals.push('No suspicious patterns detected by local demo rules.');
  }

  return { score, label, signals, threshold };
}

function renderRiskResult(result) {
  if (!scanResult || !signalList) return;

  scanResult.classList.remove('safe', 'risky', 'neutral');
  scanResult.classList.add(result.score >= result.threshold ? 'risky' : 'safe');
  scanResult.textContent = `${result.label} • Score: ${result.score}/100 • Threshold: ${result.threshold}`;

  signalList.innerHTML = '';
  result.signals.forEach((signal) => {
    const item = document.createElement('li');
    item.textContent = signal;
    signalList.appendChild(item);
  });
}

if (scanBtn && promptInput) {
  scanBtn.addEventListener('click', () => {
    const result = evaluatePromptRisk(promptInput.value);
    renderRiskResult(result);
  });
}

const models = [
  { id: 'gpt-5-3', name: 'GPT-5.3', provider: 'OpenAI', type: 'text', description: 'Top-tier general reasoning and writing model.' },
  { id: 'gpt-4-1', name: 'GPT-4.1', provider: 'OpenAI', type: 'code', description: 'Stable coding model for production implementation tasks.' },
  { id: 'grok-3-code-fast', name: 'Grok 3 Code Fast', provider: 'xAI', type: 'code', description: 'Fast coding model for quick fixes and rapid iterations.' },
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5', provider: 'Anthropic', type: 'code', description: 'Strong architecture and advanced code reasoning.' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', type: 'text', description: 'Balanced quality and speed for docs and planning.' },
  { id: 'gemini-2-5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', type: 'text', description: 'Long context text and analysis workflows.' },
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', type: 'code', description: 'Efficient coding assistant for algorithm-heavy work.' },
  { id: 'llama-3-3-70b', name: 'Llama 3.3 70B', provider: 'Meta', type: 'other', description: 'Open model option for self-hosted flexibility.' },
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', type: 'other', description: 'General purpose model with strong multilingual output.' }
];

const guardrailOptions = [
  { value: 'standard', label: 'Standard (Recommended)' },
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'strict', label: 'Strict' }
];

const modelGrid = document.getElementById('model-grid');
const modelPicker = document.getElementById('model-picker');
const launchButton = document.getElementById('launch-session');
const launchOutput = document.getElementById('launch-output');
const customInstructions = document.getElementById('custom-instructions');
const filterButtons = document.querySelectorAll('.filter-btn');
const guardrailSelect = document.getElementById('guardrail-level');

function getSavedSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem('modelSettings') || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  localStorage.setItem('modelSettings', JSON.stringify(settings));
}

function buildModelCards(filter = 'all') {
  if (!modelGrid) return;

  modelGrid.innerHTML = '';
  models
    .filter((model) => filter === 'all' || model.type === filter)
    .forEach((model) => {
      const card = document.createElement('article');
      card.className = `model-card ${model.type}`;
      card.innerHTML = `
        <h3>${model.name}</h3>
        <small>${model.provider} • ${model.type.toUpperCase()}</small>
        <p>${model.description}</p>
      `;
      modelGrid.appendChild(card);
    });
}

function fillModelPicker() {
  if (!modelPicker) return;

  modelPicker.innerHTML = '<option value="">Select a model</option>';
  models.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = `${model.name} (${model.provider})`;
    modelPicker.appendChild(option);
  });
}

function fillGuardrailPicker() {
  if (!guardrailSelect) return;

  guardrailSelect.innerHTML = '';
  guardrailOptions.forEach((item) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    guardrailSelect.appendChild(option);
  });
}

function loadModelConfig(modelId) {
  if (!modelId || !customInstructions || !guardrailSelect) return;

  const settings = getSavedSettings();
  const current = settings[modelId] || {};
  customInstructions.value = current.instructions || '';
  guardrailSelect.value = current.guardrail || 'standard';
}

function persistCurrentModelConfig() {
  if (!modelPicker || !customInstructions || !guardrailSelect) return;

  const modelId = modelPicker.value;
  if (!modelId) return;

  const settings = getSavedSettings();
  settings[modelId] = {
    instructions: customInstructions.value,
    guardrail: guardrailSelect.value
  };
  saveSettings(settings);
}

if (modelGrid) {
  buildModelCards('all');
  fillModelPicker();
  fillGuardrailPicker();

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      filterButtons.forEach((item) => item.classList.remove('active'));
      button.classList.add('active');
      buildModelCards(button.dataset.filter || 'all');
    });
  });

  if (modelPicker) {
    modelPicker.addEventListener('change', () => {
      loadModelConfig(modelPicker.value);
    });
  }

  if (customInstructions) {
    customInstructions.addEventListener('input', persistCurrentModelConfig);
  }

  if (guardrailSelect) {
    guardrailSelect.addEventListener('change', persistCurrentModelConfig);
  }
}

if (launchButton && modelPicker && launchOutput && customInstructions && guardrailSelect) {
  launchButton.addEventListener('click', () => {
    const selectedModelId = modelPicker.value;
    if (!selectedModelId) {
      launchOutput.classList.remove('safe');
      launchOutput.classList.add('risky');
      launchOutput.textContent = 'Choose a model first.';
      return;
    }

    persistCurrentModelConfig();
    const selected = models.find((model) => model.id === selectedModelId);
    const instructions = customInstructions.value.trim();

    launchOutput.classList.remove('risky');
    launchOutput.classList.add('safe');
    launchOutput.textContent = instructions
      ? `Session launched: ${selected?.name}. Guardrails: ${guardrailSelect.value}. Custom instructions saved.`
      : `Session launched: ${selected?.name}. Guardrails: ${guardrailSelect.value}.`;
  });
}
