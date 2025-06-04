import { useState } from 'react';

const ModelSelector = ({ value, onChange, disabled = false }) => {
  const models = [
    {
      value: 'flux-kontext-max',
      label: 'Flux Kontext Max',
      description: '最高质量模型，生成效果更佳',
      icon: '🚀'
    },
    {
      value: 'flux-kontext-pro',
      label: 'Flux Kontext Pro',
      description: '专业级模型，平衡质量与速度',
      icon: '⚡'
    }
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-700">
        🤖 AI 模型选择
      </label>
      
      <div className="grid grid-cols-1 gap-3">
        {models.map((model) => (
          <div
            key={model.value}
            className={`
              relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-200
              ${value === model.value
                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200/50 bg-white/70 hover:border-indigo-300 hover:bg-indigo-50/30'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !disabled && onChange(model.value)}
          >
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{model.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="model"
                    value={model.value}
                    checked={value === model.value}
                    onChange={() => onChange(model.value)}
                    disabled={disabled}
                    className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <h3 className="text-sm font-medium text-slate-900">
                    {model.label}
                  </h3>
                  {value === model.value && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      当前选择
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {model.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-xs text-slate-500 bg-slate-50/50 rounded-lg p-3">
        💡 <strong>提示：</strong>
        <br />
        • <strong>Max</strong>：推荐用于最终作品，质量更高但速度稍慢
        <br />
        • <strong>Pro</strong>：适合快速预览和测试，速度更快
      </div>
    </div>
  );
};

export default ModelSelector;
