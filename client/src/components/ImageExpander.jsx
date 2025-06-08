import React, { useState, useRef } from 'react';
import { expandImage, SERVER_BASE_URL } from '../services/api';
import BeforeAfterSlider from './BeforeAfterSlider';
import UpscaleButton from './UpscaleButton';

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ImageExpander Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">组件错误</h3>
              <p className="mt-1 text-sm text-red-600">扩图组件遇到错误，请刷新页面重试</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ImageExpander() {
  const [originalImage, setOriginalImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isExpanding, setIsExpanding] = useState(false);
  const [result, setResult] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [error, setError] = useState('');
  const [expansionSettings, setExpansionSettings] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });
  const fileInputRef = useRef(null);

  // 处理图片上传
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage({
            src: e.target.result,
            file: file,
            width: img.width,
            height: img.height
          });
          setResult(null);
          setError('');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理扩展设置变化
  const handleExpansionChange = (direction, value) => {
    setExpansionSettings(prev => ({
      ...prev,
      [direction]: parseInt(value) || 0
    }));
  };

  // 重置扩展设置
  const resetExpansion = () => {
    setExpansionSettings({
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    });
  };

  // 快速设置预设
  const applyPreset = (preset) => {
    switch (preset) {
      case 'horizontal':
        setExpansionSettings({ top: 0, bottom: 0, left: 512, right: 512 });
        break;
      case 'vertical':
        setExpansionSettings({ top: 512, bottom: 512, left: 0, right: 0 });
        break;
      case 'all':
        setExpansionSettings({ top: 256, bottom: 256, left: 256, right: 256 });
        break;
      default:
        resetExpansion();
    }
  };

  // 计算新的图片尺寸
  const getNewDimensions = () => {
    if (!originalImage) return { width: 0, height: 0 };
    
    const newWidth = originalImage.width + expansionSettings.left + expansionSettings.right;
    const newHeight = originalImage.height + expansionSettings.top + expansionSettings.bottom;
    
    return { width: newWidth, height: newHeight };
  };

  // 扩展图片
  const handleExpand = async () => {
    if (!originalImage || !prompt.trim()) {
      setError('请上传图片并输入扩展内容描述');
      return;
    }

    const totalExpansion = expansionSettings.top + expansionSettings.bottom + 
                          expansionSettings.left + expansionSettings.right;
    
    if (totalExpansion === 0) {
      setError('请至少设置一个方向的扩展像素数');
      return;
    }

    if (isExpanding) {
      console.log('⚠️ 已在处理中，忽略重复点击');
      return;
    }

    setIsExpanding(true);
    setError('');
    setResult(null);

    try {
      console.log('🔄 开始扩展...', {
        prompt,
        expansion: expansionSettings,
        newDimensions: getNewDimensions()
      });

      const options = {
        top: expansionSettings.top,
        bottom: expansionSettings.bottom,
        left: expansionSettings.left,
        right: expansionSettings.right,
        output_format: 'jpeg',
        safety_tolerance: 2
      };

      const data = await expandImage(originalImage.file, prompt, options);

      if (data.success) {
        setResult(data);
        console.log('✅ 扩展完成');
      } else {
        setError(data.error || '扩展失败');
      }
    } catch (error) {
      console.error('扩展错误:', error);
      setError(error.message);
    } finally {
      setIsExpanding(false);
    }
  };

  const handleUpscaleComplete = (result) => {
    if (result.success) {
      setUpscaledImage({
        url: result.upscaledUrl,
        originalUrl: result.originalUrl,
        upscaleType: result.upscaleType
      });
      setError('');
    } else {
      setError(result.error || '高清放大失败');
    }
  };

  const handleUpscaleStart = () => {
    setError('');
  };

  const newDimensions = getNewDimensions();

  // 计算扩展方向描述
  const getExpandDirection = () => {
    const directions = [];
    if (expansionSettings.top > 0) directions.push(`上${expansionSettings.top}px`);
    if (expansionSettings.bottom > 0) directions.push(`下${expansionSettings.bottom}px`);
    if (expansionSettings.left > 0) directions.push(`左${expansionSettings.left}px`);
    if (expansionSettings.right > 0) directions.push(`右${expansionSettings.right}px`);
    return directions.length > 0 ? directions.join(', ') : '无扩展';
  };

  const expandDirection = getExpandDirection();

  return (
    <div className="space-y-8">
      {/* 上传区域 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
        <h2 className="text-2xl font-light text-slate-800 mb-6">AI 扩图</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              上传图片
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors duration-200"
            />
          </div>

          {originalImage && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 原图预览 */}
              <div>
                <h3 className="text-lg font-medium text-slate-700 mb-4">原图预览</h3>
                <div className="relative border border-slate-200 rounded-xl overflow-hidden">
                  <img
                    src={originalImage.src}
                    alt="原图"
                    className="w-full h-auto"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {originalImage.width} × {originalImage.height}
                  </div>
                </div>
              </div>

              {/* 扩展设置 */}
              <div>
                <h3 className="text-lg font-medium text-slate-700 mb-4">扩展设置</h3>
                
                {/* 快速预设 */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-3">
                    快速预设
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyPreset('horizontal')}
                      className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm transition-colors"
                    >
                      水平扩展
                    </button>
                    <button
                      onClick={() => applyPreset('vertical')}
                      className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm transition-colors"
                    >
                      垂直扩展
                    </button>
                    <button
                      onClick={() => applyPreset('all')}
                      className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm transition-colors"
                    >
                      四周扩展
                    </button>
                    <button
                      onClick={resetExpansion}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition-colors"
                    >
                      重置
                    </button>
                  </div>
                </div>

                {/* 精确设置 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      向上扩展: {expansionSettings.top}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1024"
                      step="64"
                      value={expansionSettings.top}
                      onChange={(e) => handleExpansionChange('top', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      向下扩展: {expansionSettings.bottom}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1024"
                      step="64"
                      value={expansionSettings.bottom}
                      onChange={(e) => handleExpansionChange('bottom', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      向左扩展: {expansionSettings.left}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1024"
                      step="64"
                      value={expansionSettings.left}
                      onChange={(e) => handleExpansionChange('left', e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      向右扩展: {expansionSettings.right}px
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1024"
                      step="64"
                      value={expansionSettings.right}
                      onChange={(e) => handleExpansionChange('right', e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* 新尺寸预览 */}
                <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">扩展后尺寸</h4>
                  <p className="text-lg font-mono text-slate-600">
                    {newDimensions.width} × {newDimensions.height}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    原图: {originalImage.width} × {originalImage.height}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 提示词输入 */}
      {originalImage && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                扩展内容描述
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述要在扩展区域填充的内容，例如：blue sky with clouds, green forest, ocean waves, mountain landscape..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors duration-200"
                rows={3}
              />

              <div className="text-xs text-slate-500 mt-2">
                💡 <strong>提示：</strong>描述您希望在扩展区域看到的内容，AI会根据原图风格智能生成
              </div>
            </div>

            <button
              onClick={handleExpand}
              disabled={isExpanding || !originalImage || !prompt.trim()}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isExpanding ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>正在扩展...</span>
                </div>
              ) : (
                '开始扩展'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isExpanding && (
        <div className="bg-emerald-50/80 backdrop-blur-sm border border-emerald-200/50 text-emerald-700 px-6 py-4 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-emerald-800">正在扩展中...</h3>
              <p className="mt-1 text-sm text-emerald-600">AI 正在为您的图片添加新内容，请稍候片刻</p>
            </div>
          </div>
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">扩展失败</h3>
              <p className="mt-1 text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 结果展示 */}
      {result && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-light text-slate-800">
              {upscaledImage ? '高清放大结果对比' : '扩展结果对比'}
            </h3>
            <div className="flex items-center space-x-3">
              {result && !upscaledImage && (
                <UpscaleButton
                  imageUrl={`${SERVER_BASE_URL}${result.imageUrl}`}
                  onUpscaleComplete={handleUpscaleComplete}
                  onUpscaleStart={handleUpscaleStart}
                  buttonText="高清放大"
                  size="normal"
                />
              )}
              <a
                href={upscaledImage ? upscaledImage.url : `${SERVER_BASE_URL}${result.imageUrl}`}
                download="expanded-image.jpg"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                下载{upscaledImage ? '高清图' : '扩展图'}
              </a>
            </div>
          </div>

          <div className="space-y-6">
            {/* Before-After Slider */}
            <BeforeAfterSlider
              beforeImage={originalImage?.src}
              afterImage={upscaledImage ? upscaledImage.url : `${SERVER_BASE_URL}${result.imageUrl}`}
              beforeLabel="原图"
              afterLabel={upscaledImage ? "AI 扩展 + 高清放大" : "AI 扩展"}
              height="600px"
              className="shadow-lg"
            />

            {/* 扩展信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="font-medium text-slate-700 mb-2">原图信息</div>
                <div className="space-y-1 text-slate-600">
                  <div>尺寸: {originalImage.width} × {originalImage.height}</div>
                  <div>比例: {originalImage.height > 0 ? (originalImage.width / originalImage.height).toFixed(2) : '0'}:1</div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="font-medium text-slate-700 mb-2">扩展后信息</div>
                <div className="space-y-1 text-slate-600">
                  <div>尺寸: {newDimensions.width} × {newDimensions.height}</div>
                  <div>比例: {newDimensions.height > 0 ? (newDimensions.width / newDimensions.height).toFixed(2) : '0'}:1</div>
                  <div className="text-emerald-600 font-medium">
                    扩展: {expandDirection}
                  </div>
                </div>
              </div>
            </div>

            {/* 扩展提示词 */}
            <div className="bg-slate-50/50 rounded-2xl p-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4a2 2 0 012-2h4M4 16v4a2 2 0 002 2h4m8-16V4a2 2 0 00-2-2h-4m8 12v4a2 2 0 01-2 2h-4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-700 mb-1">扩展提示词</h4>
                    <p className="text-sm text-slate-600 font-light">{prompt}</p>
                  </div>
                </div>
                {upscaledImage && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

            {/* 操作按钮 */}
            <div className="flex space-x-4">
              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新扩展
              </button>
            </div>

            {/* 使用提示 */}
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-indigo-800">对比提示</h4>
                  <p className="mt-1 text-sm text-indigo-700">
                    拖动滑块查看 AI 扩展前后的对比效果。左侧为原图，右侧为 AI 扩展后的结果。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 导出包装了错误边界的组件
export default function ImageExpanderWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <ImageExpander />
    </ErrorBoundary>
  );
}
