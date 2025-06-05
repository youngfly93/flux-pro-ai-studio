import { useState, useRef } from 'react';
import { upscaleImage } from '../services/api';
import BeforeAfterSlider from './BeforeAfterSlider';

const ImageUpscaler = () => {
  const [originalImage, setOriginalImage] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [upscaleType, setUpscaleType] = useState('conservative');
  const [upscaleOptions, setUpscaleOptions] = useState({
    prompt: '',
    creativity: 0.35,
    output_format: 'png'
  });
  const fileInputRef = useRef(null);

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('图片文件大小不能超过 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setOriginalImage({
            file,
            url: e.target.result,
            width: img.width,
            height: img.height,
            size: file.size
          });
          setUpscaledImage(null);
          setError('');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOptionChange = (key, value) => {
    setUpscaleOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getUpscaleMultiplier = () => {
    switch (upscaleType) {
      case 'conservative':
      case 'creative':
        return 4;
      case 'fast':
        return 2;
      default:
        return 4;
    }
  };

  const getExpectedDimensions = () => {
    if (!originalImage) return { width: 0, height: 0 };
    const multiplier = getUpscaleMultiplier();
    return {
      width: originalImage.width * multiplier,
      height: originalImage.height * multiplier
    };
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpscale = async () => {
    if (!originalImage) {
      setError('请先上传图片');
      return;
    }

    setIsLoading(true);
    setError('');
    setUpscaledImage(null);

    try {
      // 为不同的放大类型设置默认prompt
      const finalOptions = { ...upscaleOptions };
      if (upscaleType === 'conservative' && !finalOptions.prompt) {
        finalOptions.prompt = 'high quality, detailed, sharp';
      } else if (upscaleType === 'creative' && !finalOptions.prompt) {
        finalOptions.prompt = 'enhance image quality, add details, improve sharpness';
      }

      console.log('🔍 开始高清放大...', {
        type: upscaleType,
        options: finalOptions,
        originalDimensions: `${originalImage.width}x${originalImage.height}`
      });

      const data = await upscaleImage(originalImage.file, upscaleType, finalOptions);
      
      if (data.success && data.imageUrl) {
        setUpscaledImage({
          url: data.imageUrl,
          width: data.width || getExpectedDimensions().width,
          height: data.height || getExpectedDimensions().height,
          size: data.size || 0
        });
        console.log('✅ 高清放大完成!');
      } else {
        throw new Error(data.error || '放大失败');
      }
    } catch (error) {
      console.error('放大错误:', error);
      setError(`放大失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (upscaledImage?.url) {
      const link = document.createElement('a');
      link.href = upscaledImage.url;
      link.download = `upscaled_${upscaleType}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-light text-slate-800 mb-4">
          AI 高清放大
        </h2>
        <p className="text-lg text-slate-600 font-light max-w-2xl mx-auto">
          使用 Stability AI 技术将图片放大至 2-4 倍分辨率，支持保守、创意和快速三种模式
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：上传和设置 */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
            <h3 className="text-xl font-medium text-slate-800 mb-6">上传图片</h3>
            
            <div className="space-y-6">
              {/* 文件上传区域 */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all duration-300"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-slate-700">点击上传图片</p>
                    <p className="text-sm text-slate-500 mt-1">支持 JPG、PNG 格式，最大 10MB</p>
                  </div>
                </div>
              </div>

              {/* 原图预览 */}
              {originalImage && (
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-700">原图预览</h4>
                  <div className="relative">
                    <img
                      src={originalImage.url}
                      alt="原图"
                      className="w-full h-48 object-cover rounded-xl border border-slate-200"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
                      {originalImage.width} × {originalImage.height}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p>尺寸: {originalImage.width} × {originalImage.height}</p>
                    <p>大小: {formatFileSize(originalImage.size)}</p>
                  </div>
                </div>
              )}

              {/* 放大模式选择 */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700">放大模式</h4>
                <div className="grid grid-cols-1 gap-3">
                  <label className="flex items-center space-x-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="upscaleType"
                      value="conservative"
                      checked={upscaleType === 'conservative'}
                      onChange={(e) => setUpscaleType(e.target.value)}
                      className="text-indigo-600"
                    />
                    <div>
                      <div className="font-medium text-slate-800">保守放大 (4x)</div>
                      <div className="text-sm text-slate-600">保持原图风格，提升清晰度</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="upscaleType"
                      value="creative"
                      checked={upscaleType === 'creative'}
                      onChange={(e) => setUpscaleType(e.target.value)}
                      className="text-indigo-600"
                    />
                    <div>
                      <div className="font-medium text-slate-800">创意放大 (4x)</div>
                      <div className="text-sm text-slate-600">AI 增强细节，添加创意元素</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input
                      type="radio"
                      name="upscaleType"
                      value="fast"
                      checked={upscaleType === 'fast'}
                      onChange={(e) => setUpscaleType(e.target.value)}
                      className="text-indigo-600"
                    />
                    <div>
                      <div className="font-medium text-slate-800">快速放大 (2x)</div>
                      <div className="text-sm text-slate-600">速度最快，基础放大</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 高级选项 */}
              <div className="space-y-4">
                <h4 className="font-medium text-slate-700">高级选项</h4>

                {/* 保守放大选项 */}
                {upscaleType === 'conservative' && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        增强提示词 (可选)
                      </label>
                      <input
                        type="text"
                        value={upscaleOptions.prompt}
                        onChange={(e) => handleOptionChange('prompt', e.target.value)}
                        placeholder="默认：high quality, detailed, sharp"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                      <div className="text-xs text-slate-500 mt-1">
                        留空将使用默认提示词，保持原图风格
                      </div>
                    </div>
                  </div>
                )}

                {/* 创意放大选项 */}
                {upscaleType === 'creative' && (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        增强提示词 (可选)
                      </label>
                      <input
                        type="text"
                        value={upscaleOptions.prompt}
                        onChange={(e) => handleOptionChange('prompt', e.target.value)}
                        placeholder="默认：enhance image quality, add details, improve sharpness"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        创意程度: {upscaleOptions.creativity}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={upscaleOptions.creativity}
                        onChange={(e) => handleOptionChange('creativity', parseFloat(e.target.value))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>保守 (0)</span>
                        <span>创意 (1)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：预期结果和操作 */}
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
            <h3 className="text-xl font-medium text-slate-800 mb-6">预期结果</h3>
            
            {originalImage ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="font-medium text-slate-700 mb-2">尺寸变化</h4>
                  <div className="text-sm text-slate-600">
                    <p>原始: {originalImage.width} × {originalImage.height}</p>
                    <p>放大后: {getExpectedDimensions().width} × {getExpectedDimensions().height}</p>
                    <p className="mt-2 font-medium">放大倍数: {getUpscaleMultiplier()}x</p>
                  </div>
                </div>
                
                <button
                  onClick={handleUpscale}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-2xl font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>处理中...</span>
                    </>
                  ) : (
                    <span>开始高清放大</span>
                  )}
                </button>
                
                <div className="text-xs text-slate-500 text-center">
                  💡 提示：放大过程可能需要1-2分钟，请耐心等待
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-slate-500">请先上传图片</p>
              </div>
            )}
          </div>

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
                  <h3 className="text-sm font-medium text-red-800">放大失败</h3>
                  <p className="mt-1 text-sm text-red-600">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 放大结果 */}
          {upscaledImage && (
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg border border-white/20 p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-medium text-slate-800">放大结果对比</h3>
                <button
                  onClick={downloadImage}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-4 py-2 rounded-xl font-medium hover:from-emerald-600 hover:to-teal-600 transition-all duration-300 flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>下载高清图</span>
                </button>
              </div>

              <div className="space-y-6">
                {/* Before-After Slider */}
                <BeforeAfterSlider
                  beforeImage={originalImage.url}
                  afterImage={upscaledImage.url}
                  beforeLabel="原图"
                  afterLabel={`${upscaleType === 'conservative' ? '保守' : upscaleType === 'creative' ? '创意' : '快速'}放大`}
                  height="400px"
                  className="shadow-lg"
                />

                {/* 详细信息 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="font-medium text-slate-700 mb-2">原图信息</div>
                    <div className="space-y-1 text-slate-600">
                      <div>尺寸: {originalImage.width} × {originalImage.height}</div>
                      <div>大小: {formatFileSize(originalImage.size)}</div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="font-medium text-slate-700 mb-2">放大后信息</div>
                    <div className="space-y-1 text-slate-600">
                      <div>尺寸: {upscaledImage.width} × {upscaledImage.height}</div>
                      <div>大小: {formatFileSize(upscaledImage.size)}</div>
                      <div className="text-emerald-600 font-medium">
                        放大倍数: {getUpscaleMultiplier()}x
                      </div>
                    </div>
                  </div>
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
                      <h4 className="text-sm font-medium text-indigo-800">使用提示</h4>
                      <p className="mt-1 text-sm text-indigo-700">
                        拖动中间的滑块可以对比原图和放大后的效果。您也可以使用键盘左右箭头键进行精细调节。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUpscaler;
