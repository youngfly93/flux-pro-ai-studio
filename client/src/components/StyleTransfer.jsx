import { useState, useRef } from 'react';
import { transferStyle, SERVER_BASE_URL } from '../services/api';
import ModelSelector from './ModelSelector';
import BeforeAfterSlider from './BeforeAfterSlider';
import UpscaleButton from './UpscaleButton';

const StyleTransfer = () => {
  const [contentImage, setContentImage] = useState(null);
  const [styleImage, setStyleImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [error, setError] = useState('');
  const [styleStrength, setStyleStrength] = useState(0.7);
  
  const contentInputRef = useRef(null);
  const styleInputRef = useRef(null);
  
  const [options, setOptions] = useState({
    aspect_ratio: '1:1',
    output_format: 'jpeg',
    seed: '',
    safety_tolerance: 2,
    model: 'flux-kontext-max'
  });

  const aspectRatios = [
    { value: '1:1', label: '1:1 (正方形)' },
    { value: '16:9', label: '16:9 (横屏)' },
    { value: '9:16', label: '9:16 (竖屏)' },
    { value: '4:3', label: '4:3 (传统横屏)' },
    { value: '3:4', label: '3:4 (肖像)' }
  ];

  const stylePresets = [
    { name: '油画风格', prompt: 'oil painting style, thick brushstrokes, artistic' },
    { name: '水彩画', prompt: 'watercolor painting style, soft colors, flowing' },
    { name: '素描风格', prompt: 'pencil sketch style, black and white, detailed lines' },
    { name: '动漫风格', prompt: 'anime style, vibrant colors, manga art' },
    { name: '印象派', prompt: 'impressionist style, soft brushstrokes, light effects' },
    { name: '抽象艺术', prompt: 'abstract art style, geometric shapes, modern' },
    { name: '梵高风格', prompt: 'Van Gogh style, swirling brushstrokes, expressive' },
    { name: '毕加索风格', prompt: 'Picasso style, cubist, geometric faces' }
  ];

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

  const handleStyleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setStyleImage({
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

    if (!styleImage) {
      setError('请选择风格图片');
      return;
    }

    if (!prompt.trim()) {
      setError('请输入风格描述或选择预设风格');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setUpscaledImage(null);

    try {
      console.log('🎨 开始风格迁移...');
      
      const transferOptions = {
        ...options,
        styleStrength
      };

      const data = await transferStyle(contentImage.file, styleImage.file, prompt, transferOptions);
      
      if (data.success) {
        setResult({
          url: `${SERVER_BASE_URL}${data.imageUrl}`,
          originalUrl: data.originalUrl,
          contentUrl: contentImage.url,
          styleUrl: styleImage.url
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
    if (styleImage) URL.revokeObjectURL(styleImage.url);
    
    setContentImage(null);
    setStyleImage(null);
    setResult(null);
    setUpscaledImage(null);
    setError('');
    setPrompt('');
    
    if (contentInputRef.current) contentInputRef.current.value = '';
    if (styleInputRef.current) styleInputRef.current.value = '';
  };

  const applyStylePreset = (preset) => {
    setPrompt(preset.prompt);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* 标题和说明 */}
      <div className="text-center">
        <h2 className="text-3xl font-light text-slate-800 mb-4">🎭 AI 风格迁移</h2>
        <p className="text-slate-600 max-w-3xl mx-auto">
          上传内容图片和风格参考图片，AI 将把风格图片的艺术风格应用到内容图片上，创造独特的艺术作品。
        </p>
      </div>

      {/* 图片上传区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 内容图片上传 */}
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">📸 内容图片</h3>
          <p className="text-sm text-slate-600 mb-4">上传要应用风格的主要图片</p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-slate-500">
                    <span className="font-semibold">点击上传内容图片</span>
                  </p>
                  <p className="text-xs text-slate-500">支持 PNG, JPG, WEBP</p>
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
                  className="w-full h-48 object-cover rounded-xl border border-slate-200"
                />
                <div className="absolute top-2 right-2 bg-white/90 text-slate-700 text-xs px-2 py-1 rounded-lg">
                  内容图片
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 风格图片上传 */}
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4">🎨 风格图片</h3>
          <p className="text-sm text-slate-600 mb-4">上传提供风格参考的图片</p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-8 h-8 mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-sm text-slate-500">
                    <span className="font-semibold">点击上传风格图片</span>
                  </p>
                  <p className="text-xs text-slate-500">支持 PNG, JPG, WEBP</p>
                </div>
                <input
                  ref={styleInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStyleImageSelect}
                  className="hidden"
                />
              </label>
            </div>

            {styleImage && (
              <div className="relative">
                <img
                  src={styleImage.url}
                  alt="风格图片"
                  className="w-full h-48 object-cover rounded-xl border border-slate-200"
                />
                <div className="absolute top-2 right-2 bg-white/90 text-slate-700 text-xs px-2 py-1 rounded-lg">
                  风格图片
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 风格设置 */}
      {contentImage && styleImage && (
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
          <h3 className="text-lg font-medium text-slate-800 mb-6">🎨 风格设置</h3>

          <div className="space-y-6">
            {/* 风格预设 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">快速风格预设</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {stylePresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => applyStylePreset(preset)}
                    className="p-3 text-sm border border-slate-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left"
                    disabled={loading}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 风格描述 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                风格描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述想要的风格效果，例如：油画风格，厚重的笔触，艺术感..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                rows={3}
                disabled={loading}
              />
              <p className="mt-2 text-xs text-slate-500">
                💡 提示：描述越详细，风格迁移效果越准确。可以使用上方的预设风格。
              </p>
            </div>

            {/* 风格强度 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                风格强度 ({Math.round(styleStrength * 100)}%)
              </label>
              <div className="space-y-3">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={styleStrength}
                  onChange={(e) => setStyleStrength(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>轻微 (10%)</span>
                  <span>适中 (50%)</span>
                  <span>强烈 (100%)</span>
                </div>
                <div className="flex gap-2">
                  {[0.3, 0.5, 0.7, 0.9].map((strength) => (
                    <button
                      key={strength}
                      onClick={() => setStyleStrength(strength)}
                      className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                        Math.abs(styleStrength - strength) < 0.05
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      disabled={loading}
                    >
                      {Math.round(strength * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 高级选项 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 宽高比 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">输出宽高比</label>
                <select
                  value={options.aspect_ratio}
                  onChange={(e) => setOptions(prev => ({ ...prev, aspect_ratio: e.target.value }))}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  disabled={loading}
                >
                  {aspectRatios.map((ratio) => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label}
                    </option>
                  ))}
                </select>
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
                disabled={loading || !contentImage || !styleImage || !prompt.trim()}
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

              {(contentImage || styleImage) && (
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

          {/* 对比显示 */}
          <BeforeAfterSlider
            beforeImage={result.contentUrl}
            afterImage={upscaledImage ? upscaledImage.url : result.url}
            beforeLabel="原始内容"
            afterLabel={upscaledImage ? "风格迁移 + 高清放大" : "风格迁移"}
            height="600px"
            className="shadow-lg"
          />

          {/* 风格迁移信息 */}
          <div className="mt-6 bg-slate-50/50 rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">内容图片</h4>
                  <p className="text-sm text-slate-600 font-light">{contentImage.name}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-purple-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">风格强度</h4>
                  <p className="text-sm text-slate-600 font-light">{Math.round(styleStrength * 100)}% • {options.model}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">风格描述</h4>
                  <p className="text-sm text-slate-600 font-light">{prompt}</p>
                </div>
              </div>

              {upscaledImage && (
                <div className="flex items-start space-x-3 md:col-span-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-700 mb-1">高清放大</h4>
                    <p className="text-sm text-slate-600 font-light">
                      {upscaledImage.upscaleType === 'conservative' ? '保守模式 (4x)' : upscaledImage.upscaleType === 'creative' ? '创意模式 (4x)' : '快速模式 (2x)'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StyleTransfer;
