import { useState } from 'react';
import { upscaleImage, SERVER_BASE_URL } from '../services/api';

const UpscaleButton = ({ 
  imageUrl, 
  onUpscaleComplete, 
  onUpscaleStart, 
  className = "",
  buttonText = "高清放大",
  size = "normal" // normal, small, large
}) => {
  const [isUpscaling, setIsUpscaling] = useState(false);
  const [error, setError] = useState('');
  const [upscaleType, setUpscaleType] = useState('conservative');
  const [showOptions, setShowOptions] = useState(false);

  // 从 URL 获取图片文件
  const urlToFile = async (url, filename = 'image.jpg') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new File([blob], filename, { type: blob.type });
    } catch (error) {
      console.error('Error converting URL to file:', error);
      throw new Error('无法获取图片文件');
    }
  };

  const handleUpscale = async () => {
    if (!imageUrl) {
      setError('没有可用的图片进行放大');
      return;
    }

    setIsUpscaling(true);
    setError('');
    
    if (onUpscaleStart) {
      onUpscaleStart();
    }

    try {
      console.log('🔍 开始高清放大...', { imageUrl, upscaleType });

      // 将图片 URL 转换为文件
      const imageFile = await urlToFile(imageUrl, `upscale-input-${Date.now()}.jpg`);

      // 准备放大选项
      const options = {
        prompt: '', // 高清放大通常不需要提示词
        creativity: upscaleType === 'creative' ? 0.3 : 0.1,
        output_format: 'png'
      };

      console.log('📐 放大选项:', { upscaleType, options });

      const data = await upscaleImage(imageFile, upscaleType, options);
      
      if (data.success && data.imageUrl) {
        // 转换为完整 URL
        const fullImageUrl = data.imageUrl.startsWith('http')
          ? data.imageUrl
          : `${SERVER_BASE_URL}${data.imageUrl}`;

        console.log('✅ 高清放大完成:', fullImageUrl);

        if (onUpscaleComplete) {
          onUpscaleComplete({
            success: true,
            originalUrl: imageUrl,
            upscaledUrl: fullImageUrl,
            upscaleType: upscaleType,
            data: data
          });
        }
      } else {
        throw new Error(data.error || '高清放大失败');
      }
    } catch (error) {
      console.error('高清放大错误:', error);
      setError(error.message);
      
      if (onUpscaleComplete) {
        onUpscaleComplete({
          success: false,
          error: error.message
        });
      }
    } finally {
      setIsUpscaling(false);
    }
  };

  // 根据 size 设置样式
  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return 'px-3 py-1.5 text-sm';
      case 'large':
        return 'px-6 py-4 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 'w-3 h-3';
      case 'large':
        return 'w-6 h-6';
      default:
        return 'w-4 h-4';
    }
  };

  return (
    <div className="relative">
      {/* 主按钮 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={showOptions ? handleUpscale : () => setShowOptions(true)}
          disabled={isUpscaling || !imageUrl}
          className={`
            inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 
            hover:from-purple-600 hover:to-pink-600 disabled:from-slate-300 disabled:to-slate-400 
            text-white font-medium rounded-xl transition-all duration-200 transform hover:scale-105 
            disabled:scale-100 disabled:cursor-not-allowed
            ${getSizeClasses()} ${className}
          `}
        >
          {isUpscaling ? (
            <>
              <div className={`border-2 border-white border-t-transparent rounded-full animate-spin ${getIconSize()}`}></div>
              <span>放大中...</span>
            </>
          ) : (
            <>
              <svg className={getIconSize()} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
              </svg>
              <span>{showOptions ? '确认放大' : buttonText}</span>
            </>
          )}
        </button>

        {/* 选项按钮 */}
        {showOptions && !isUpscaling && (
          <button
            onClick={() => setShowOptions(false)}
            className="px-2 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg transition-colors"
            title="取消"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 放大选项 */}
      {showOptions && !isUpscaling && (
        <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-10 min-w-64">
          <h4 className="text-sm font-medium text-slate-700 mb-3">选择放大模式</h4>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="upscaleType"
                value="conservative"
                checked={upscaleType === 'conservative'}
                onChange={(e) => setUpscaleType(e.target.value)}
                className="text-purple-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">保守模式 (4x)</div>
                <div className="text-xs text-slate-500">保持原图风格，质量最高</div>
              </div>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="upscaleType"
                value="creative"
                checked={upscaleType === 'creative'}
                onChange={(e) => setUpscaleType(e.target.value)}
                className="text-purple-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">创意模式 (4x)</div>
                <div className="text-xs text-slate-500">增强细节，可能改变风格</div>
              </div>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="upscaleType"
                value="fast"
                checked={upscaleType === 'fast'}
                onChange={(e) => setUpscaleType(e.target.value)}
                className="text-purple-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">快速模式 (2x)</div>
                <div className="text-xs text-slate-500">速度最快，适合预览</div>
              </div>
            </label>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
            💡 建议：保守模式适合照片，创意模式适合艺术作品
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="absolute top-full left-0 mt-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm z-10">
          {error}
        </div>
      )}
    </div>
  );
};

export default UpscaleButton;
