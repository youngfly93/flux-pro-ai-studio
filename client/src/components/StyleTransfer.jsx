import { useState, useRef, useEffect } from 'react';
import { transferStyle, transferStyleWithReference, SERVER_BASE_URL } from '../services/api';
import ModelSelector from './ModelSelector';
import BeforeAfterSlider from './BeforeAfterSlider';
import UpscaleButton from './UpscaleButton';

const StyleTransfer = () => {
  const [contentImage, setContentImage] = useState(null);
  const [styleReferenceImage, setStyleReferenceImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [error, setError] = useState('');
  const [useImageReference, setUseImageReference] = useState(false);

  // 风格预设管理状态
  const [stylePresets, setStylePresets] = useState([]);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetPrompt, setNewPresetPrompt] = useState('');

  const contentInputRef = useRef(null);
  const styleInputRef = useRef(null);
  
  const [options, setOptions] = useState({
    output_format: 'jpeg',
    seed: '',
    safety_tolerance: 2,
    model: 'flux-kontext-max'
  });

  // 默认风格预设
  const defaultStylePresets = [
    {
      id: 'watercolor',
      name: '水彩风格',
      prompt: 'Transform the style into a watercolor style, cute, keeping the characters and background unchanged',
      isDefault: true
    },
    {
      id: 'ghibli',
      name: '吉卜力风格',
      prompt: 'Change the style to Japanese Ghibli style, keeping the characters and environment unchanged',
      isDefault: true
    },
    {
      id: 'clay3d',
      name: '3D粘土风格',
      prompt: 'Change the style to cartoon 3D clay texture style, keeping the characters and environment unchanged',
      isDefault: true
    },
    {
      id: 'pixel',
      name: '像素风格',
      prompt: 'Convert the style to a 16-bit mosaic pixel style, keeping the main character and background unchanged',
      isDefault: true
    },
    {
      id: 'cartoon3d',
      name: '卡通3D风格',
      prompt: 'Convert to cartoon 3D animation style similar to Pixar or Disney animation with smooth surfaces, bright vibrant colors, simplified but expressive facial features, and 3D animation aesthetics, while keeping the exact same person, pose, facial expression, clothing, background, and scene composition unchanged',
      isDefault: true
    },
    {
      id: 'anime',
      name: '动漫风格',
      prompt: 'Convert to anime/manga style with large expressive eyes, stylized proportions, clean line art, and vibrant colors, while keeping the exact same person, pose, facial expression, clothing, and scene composition unchanged',
      isDefault: true
    }
  ];

  // 本地存储键名
  const STORAGE_KEYS = {
    STYLE_PRESETS: 'flux_pro_style_presets',
    APP_SETTINGS: 'flux_pro_app_settings'
  };

  // 从本地存储加载数据
  const loadFromStorage = () => {
    try {
      const savedPresets = localStorage.getItem(STORAGE_KEYS.STYLE_PRESETS);
      if (savedPresets) {
        const parsedPresets = JSON.parse(savedPresets);
        setStylePresets(parsedPresets);
      } else {
        setStylePresets(defaultStylePresets);
        localStorage.setItem(STORAGE_KEYS.STYLE_PRESETS, JSON.stringify(defaultStylePresets));
      }

      const savedSettings = localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.options) {
          setOptions(prev => ({ ...prev, ...parsedSettings.options }));
        }
        if (parsedSettings.useImageReference !== undefined) {
          setUseImageReference(parsedSettings.useImageReference);
        }
      }
    } catch (error) {
      console.error('加载本地存储数据失败:', error);
      setStylePresets(defaultStylePresets);
    }
  };

  // 保存到本地存储
  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEYS.STYLE_PRESETS, JSON.stringify(stylePresets));
      const settings = {
        options,
        useImageReference,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('保存到本地存储失败:', error);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadFromStorage();
  }, []);

  // 当相关状态变化时保存数据
  useEffect(() => {
    if (stylePresets.length > 0) {
      saveToStorage();
    }
  }, [stylePresets, options, useImageReference]);

  const handleContentImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setContentImage({
        file,
        url: URL.createObjectURL(file),
        name: file.name
      });
      setError('');
    } else {
      setError('请选择有效的图片文件');
    }
  };

  const handleStyleReferenceImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setStyleReferenceImage({
        file,
        url: URL.createObjectURL(file),
        name: file.name
      });
      setError('');
    } else {
      setError('请选择有效的图片文件');
    }
  };

  const handleStyleTransfer = async () => {
    if (!contentImage) {
      setError('请选择内容图片');
      return;
    }

    if (useImageReference && !styleReferenceImage) {
      setError('请选择风格参考图片');
      return;
    }

    if (!useImageReference && !prompt.trim()) {
      setError('请输入风格描述或选择预设风格');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setUpscaledImage(null);

    try {
      console.log('🎨 开始风格迁移...');

      let data;
      if (useImageReference && styleReferenceImage) {
        console.log('🖼️ 使用图片参考模式');
        data = await transferStyleWithReference(contentImage.file, styleReferenceImage.file, prompt, options);
      } else {
        console.log('📝 使用文本描述模式');
        data = await transferStyle(contentImage.file, prompt, options);
      }

      if (data.success) {
        setResult({
          url: `${SERVER_BASE_URL}${data.imageUrl}`,
          originalUrl: data.originalUrl,
          contentUrl: contentImage.url,
          styleReferenceUrl: useImageReference && styleReferenceImage ? styleReferenceImage.url : null
        });
        console.log('✅ 风格迁移成功');
      } else {
        setError('风格迁移失败');
      }
    } catch (err) {
      console.error('风格迁移错误:', err);
      setError(err.message || '风格迁移时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleUpscaleComplete = (upscaleResult) => {
    if (upscaleResult.success) {
      setUpscaledImage({
        url: upscaleResult.upscaledUrl,
        originalUrl: upscaleResult.originalUrl,
        upscaleType: upscaleResult.upscaleType
      });
      setError('');
    } else {
      setError(upscaleResult.error || '高清放大失败');
    }
  };

  const handleUpscaleStart = () => {
    setError('');
  };

  const handleDownload = () => {
    const imageToDownload = upscaledImage || result;
    if (imageToDownload) {
      const link = document.createElement('a');
      link.href = imageToDownload.url;
      link.download = `style-transfer-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearImages = () => {
    if (contentImage) URL.revokeObjectURL(contentImage.url);
    if (styleReferenceImage) URL.revokeObjectURL(styleReferenceImage.url);

    setContentImage(null);
    setStyleReferenceImage(null);
    setResult(null);
    setUpscaledImage(null);
    setError('');
    setPrompt('');
    setUseImageReference(false);

    if (contentInputRef.current) contentInputRef.current.value = '';
    if (styleInputRef.current) styleInputRef.current.value = '';
  };

  const applyStylePreset = (preset) => {
    setPrompt(preset.prompt);
  };

  // 风格预设管理功能
  const addNewPreset = () => {
    if (!newPresetName.trim() || !newPresetPrompt.trim()) {
      setError('请填写完整的预设名称和提示词');
      return;
    }

    const newPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName.trim(),
      prompt: newPresetPrompt.trim(),
      isDefault: false
    };

    setStylePresets(prev => [...prev, newPreset]);
    setNewPresetName('');
    setNewPresetPrompt('');
    setError('');
  };

  const editPreset = (preset) => {
    setEditingPreset(preset);
    setNewPresetName(preset.name);
    setNewPresetPrompt(preset.prompt);
  };

  const saveEditedPreset = () => {
    if (!newPresetName.trim() || !newPresetPrompt.trim()) {
      setError('请填写完整的预设名称和提示词');
      return;
    }

    setStylePresets(prev => prev.map(preset => 
      preset.id === editingPreset.id 
        ? { ...preset, name: newPresetName.trim(), prompt: newPresetPrompt.trim() }
        : preset
    ));

    setEditingPreset(null);
    setNewPresetName('');
    setNewPresetPrompt('');
    setError('');
  };

  const deletePreset = (presetId) => {
    if (window.confirm('确定要删除这个风格预设吗？')) {
      setStylePresets(prev => prev.filter(preset => preset.id !== presetId));
    }
  };

  const resetToDefaults = () => {
    if (window.confirm('确定要重置为默认预设吗？这将删除所有自定义预设。')) {
      setStylePresets(defaultStylePresets);
      localStorage.setItem(STORAGE_KEYS.STYLE_PRESETS, JSON.stringify(defaultStylePresets));
    }
  };

  const cancelEdit = () => {
    setEditingPreset(null);
    setNewPresetName('');
    setNewPresetPrompt('');
    setError('');
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* 标题和说明 */}
      <div className="text-center">
        <h2 className="text-3xl font-light text-slate-800 mb-4">🎭 AI 风格迁移</h2>
        <p className="text-slate-600 max-w-3xl mx-auto">
          上传图片并选择想要的艺术风格，AI 将为您的图片应用专业的艺术效果，创造独特的艺术作品。
        </p>
      </div>

      {/* 图片上传区域 */}
      <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
        <h3 className="text-lg font-medium text-slate-800 mb-6">📸 上传图片</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 内容图片上传 */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-slate-700">内容图片 <span className="text-red-500">*</span></h4>
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-6 h-6 mb-2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold">上传内容图片</span>
                  </p>
                  <p className="text-xs text-slate-500">要进行风格迁移的图片</p>
                </div>
                <input
                  ref={contentInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleContentImageSelect}
                  className="hidden"
                />
              </label>
            </div>

            {contentImage && (
              <div className="relative">
                <img
                  src={contentImage.url}
                  alt="内容图片"
                  className="w-full max-h-48 object-contain rounded-xl border border-slate-200 shadow-lg"
                />
                <div className="absolute top-2 right-2 bg-blue-500/90 text-white text-xs px-2 py-1 rounded-lg">
                  内容图片
                </div>
              </div>
            )}
          </div>

          {/* 风格参考图片上传 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <h4 className="text-md font-medium text-slate-700">风格参考图片</h4>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useImageReference}
                  onChange={(e) => setUseImageReference(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-600">启用图片参考</span>
              </label>
            </div>

            {useImageReference && (
              <>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-purple-300 border-dashed rounded-2xl cursor-pointer bg-purple-50/50 hover:bg-purple-100/50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-6 h-6 mb-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-purple-600">
                        <span className="font-semibold">上传风格参考</span>
                      </p>
                      <p className="text-xs text-purple-500">提供风格样式的图片</p>
                    </div>
                    <input
                      ref={styleInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleStyleReferenceImageSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {styleReferenceImage && (
                  <div className="relative">
                    <img
                      src={styleReferenceImage.url}
                      alt="风格参考图片"
                      className="w-full max-h-48 object-contain rounded-xl border border-purple-200 shadow-lg"
                    />
                    <div className="absolute top-2 right-2 bg-purple-500/90 text-white text-xs px-2 py-1 rounded-lg">
                      风格参考
                    </div>
                  </div>
                )}
              </>
            )}

            {!useImageReference && (
              <div className="flex items-center justify-center w-full h-32 border-2 border-slate-200 border-dashed rounded-2xl bg-slate-50/30">
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm text-slate-400">使用文本描述风格</p>
                  <p className="text-xs text-slate-400">勾选上方选项启用图片参考</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 风格设置 */}
      {contentImage && (
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
          <h3 className="text-lg font-medium text-slate-800 mb-6">🎨 风格设置</h3>

          <div className="space-y-6">
            {/* 风格预设 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">🎨 快速风格预设</label>
                <button
                  onClick={() => setShowPresetManager(!showPresetManager)}
                  className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center space-x-1"
                  disabled={loading}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                  <span>管理预设</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stylePresets.map((preset) => (
                  <div key={preset.id} className="relative group">
                    <button
                      onClick={() => applyStylePreset(preset)}
                      className={`w-full p-3 text-sm border rounded-xl transition-all duration-200 text-left ${
                        prompt === preset.prompt
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-25'
                      }`}
                      disabled={loading}
                    >
                      <div className="font-medium">{preset.name}</div>
                      {!preset.isDefault && (
                        <div className="text-xs text-slate-500 mt-1">自定义</div>
                      )}
                    </button>

                    {showPresetManager && (
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editPreset(preset);
                          }}
                          className="w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center text-xs"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        {!preset.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePreset(preset.id);
                            }}
                            className="w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                            title="删除"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 预设管理面板 */}
              {showPresetManager && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    {editingPreset ? '编辑风格预设' : '添加新的风格预设'}
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">预设名称</label>
                      <input
                        type="text"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        placeholder="例如：油画风格"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        disabled={loading}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">提示词</label>
                      <textarea
                        value={newPresetPrompt}
                        onChange={(e) => setNewPresetPrompt(e.target.value)}
                        placeholder="例如：Transform to oil painting style with thick brushstrokes, keeping the characters unchanged"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        rows={3}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={editingPreset ? saveEditedPreset : addNewPreset}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm rounded-lg transition-colors"
                        disabled={loading}
                      >
                        {editingPreset ? '保存修改' : '添加预设'}
                      </button>

                      {editingPreset && (
                        <button
                          onClick={cancelEdit}
                          className="px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                          disabled={loading}
                        >
                          取消
                        </button>
                      )}

                      <button
                        onClick={resetToDefaults}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg transition-colors"
                        disabled={loading}
                      >
                        重置默认
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 风格描述 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                ✍️ 风格描述 {!useImageReference && <span className="text-red-500">*</span>}
                {useImageReference && <span className="text-slate-500">(可选，用于补充说明)</span>}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={useImageReference
                  ? "可选：补充描述风格细节，例如：更强调色彩对比，增加艺术感..."
                  : "描述想要的风格效果，例如：水彩风格，保持角色不变；吉卜力风格，保持环境不变..."
                }
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                rows={3}
                disabled={loading}
              />
              <p className="mt-2 text-xs text-slate-500">
                {useImageReference
                  ? "💡 提示：已启用图片参考模式，风格描述为可选项，可用于补充说明风格细节。"
                  : "💡 提示：建议使用上方预设风格，这些都是经过FLUX.1 Kontext验证的最佳实践提示词，效果更佳。"
                }
              </p>
            </div>

            {/* 高级选项 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 宽高比 - 自动保持原图比例 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">输出宽高比</label>
                <div className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-center space-x-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>自动保持原图比例</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">系统将自动检测并保持原图的宽高比，无需手动设置</p>
              </div>

              {/* 输出格式 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">输出格式</label>
                <select
                  value={options.output_format}
                  onChange={(e) => setOptions(prev => ({ ...prev, output_format: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="jpeg">JPEG (推荐)</option>
                  <option value="png">PNG (透明背景)</option>
                </select>
              </div>
            </div>

            {/* 模型选择 */}
            <ModelSelector
              value={options.model}
              onChange={(model) => setOptions(prev => ({ ...prev, model }))}
              disabled={loading}
            />

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleStyleTransfer}
                disabled={loading || !contentImage || (useImageReference ? !styleReferenceImage : !prompt.trim())}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>风格迁移中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span>开始风格迁移</span>
                  </div>
                )}
              </button>

              {contentImage && (
                <button
                  onClick={clearImages}
                  disabled={loading}
                  className="px-6 py-3 bg-slate-500 hover:bg-slate-600 disabled:bg-slate-300 text-white font-medium rounded-xl transition-colors"
                >
                  重新选择
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">操作失败</h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 风格迁移结果 */}
      {result && (
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-slate-800">
              {upscaledImage ? '高清放大结果' : '风格迁移结果'}
            </h3>
            <div className="flex items-center space-x-3">
              {result && !upscaledImage && (
                <UpscaleButton
                  imageUrl={result.url}
                  onUpscaleComplete={handleUpscaleComplete}
                  onUpscaleStart={handleUpscaleStart}
                  buttonText="高清放大"
                  size="normal"
                />
              )}
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>下载{upscaledImage ? '高清图' : '结果'}</span>
              </button>
            </div>
          </div>

          {/* 图片展示 */}
          {result.styleReferenceUrl ? (
            // 三图对比：原图 + 风格参考 + 结果
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700 text-center">原始内容</h4>
                  <img
                    src={result.contentUrl}
                    alt="原始内容"
                    className="w-full h-64 object-contain rounded-xl border border-slate-200 shadow-lg bg-slate-50"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700 text-center">风格参考</h4>
                  <img
                    src={result.styleReferenceUrl}
                    alt="风格参考"
                    className="w-full h-64 object-contain rounded-xl border border-purple-200 shadow-lg bg-purple-50"
                  />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-slate-700 text-center">
                    {upscaledImage ? '风格迁移 + 高清放大' : '风格迁移结果'}
                  </h4>
                  <img
                    src={upscaledImage ? upscaledImage.url : result.url}
                    alt="风格迁移结果"
                    className="w-full h-64 object-contain rounded-xl border border-emerald-200 shadow-lg bg-emerald-50"
                  />
                </div>
              </div>

              {/* 对比滑块 */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-slate-700 mb-3 text-center">对比查看</h4>
                <BeforeAfterSlider
                  beforeImage={result.contentUrl}
                  afterImage={upscaledImage ? upscaledImage.url : result.url}
                  beforeLabel="原始内容"
                  afterLabel={upscaledImage ? "风格迁移 + 高清放大" : "风格迁移"}
                  height="400px"
                  className="shadow-lg"
                />
              </div>
            </div>
          ) : (
            // 二图对比：原图 + 结果
            <BeforeAfterSlider
              beforeImage={result.contentUrl}
              afterImage={upscaledImage ? upscaledImage.url : result.url}
              beforeLabel="原始内容"
              afterLabel={upscaledImage ? "风格迁移 + 高清放大" : "风格迁移"}
              height="600px"
              className="shadow-lg"
            />
          )}
        </div>
      )}
    </div>
  );
};

export default StyleTransfer;
