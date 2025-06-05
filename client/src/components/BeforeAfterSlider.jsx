import { useState, useRef, useEffect } from 'react';

const BeforeAfterSlider = ({
  beforeImage,
  afterImage,
  beforeLabel = "原图",
  afterLabel = "AI 处理后",
  className = "",
  height = "400px",
  aspectRatio = null // 新增：支持自定义宽高比
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef(null);
  const sliderRef = useRef(null);

  // 图片加载完成处理
  const handleImageLoad = (imageType) => {
    console.log(`🖼️ ${imageType} 图片加载完成`);
    setLoadedCount(prev => {
      const newCount = prev + 1;
      console.log(`📊 已加载图片数量: ${newCount}/2`);
      if (newCount >= 2) {
        console.log('✅ 所有图片加载完成，显示对比界面');
        setImagesLoaded(true);
      }
      return newCount;
    });
  };

  // 重置加载状态
  useEffect(() => {
    console.log('🔄 重置图片加载状态', { beforeImage, afterImage });
    setImagesLoaded(false);
    setLoadedCount(0);
    setHasError(false);

    // 设置超时机制，5秒后强制显示（图片可能很大）
    const timeout = setTimeout(() => {
      console.log('⏰ 图片加载超时，强制显示内容');
      setImagesLoaded(true);
    }, 5000);

    return () => clearTimeout(timeout);
  }, [beforeImage, afterImage]);

  // 处理鼠标/触摸移动
  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  // 鼠标事件处理
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleMove(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 触摸事件处理
  const handleTouchStart = (e) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // 添加全局事件监听器
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  // 键盘控制
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowLeft') {
      setSliderPosition(Math.max(0, sliderPosition - 1));
    } else if (e.key === 'ArrowRight') {
      setSliderPosition(Math.min(100, sliderPosition + 1));
    }
  };

  if (!beforeImage || !afterImage) {
    return null;
  }

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 ${className}`}>
      {/* 加载指示器 */}
      {!imagesLoaded && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center z-20">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-sm text-slate-600">加载图片中... ({loadedCount}/2)</span>
            <div className="text-xs text-slate-500">
              {loadedCount === 0 && "正在加载原图和放大图..."}
              {loadedCount === 1 && "已加载1张图片，等待另一张..."}
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {hasError && imagesLoaded && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm z-30">
          ⚠️ 部分图片加载失败，可能影响对比效果
        </div>
      )}

      {/* 容器 */}
      <div
        ref={containerRef}
        className={`relative cursor-col-resize select-none ${!imagesLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{
          height: aspectRatio ? 'auto' : height,
          aspectRatio: aspectRatio || 'auto',
          minHeight: '300px', // 确保最小高度
          maxHeight: '600px', // 限制最大高度
          width: '100%'
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="slider"
        aria-label="拖动对比原图和处理后的图片"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={sliderPosition}
      >
        {/* After 图片 (背景) */}
        <div className="absolute inset-0">
          <img
            src={afterImage}
            alt={afterLabel}
            className="w-full h-full object-contain"
            draggable={false}
            style={{ objectPosition: 'center' }}
            onLoad={() => handleImageLoad('After')}
            onError={(e) => {
              console.error('❌ After image failed to load:', e);
              console.error('After image URL:', afterImage);
              setHasError(true);
              setImagesLoaded(true); // 即使出错也显示界面
            }}
          />
          {/* After 标签 */}
          <div className="absolute top-4 right-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
            {afterLabel}
          </div>
        </div>

        {/* Before 图片 (前景，可裁剪) */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="w-full h-full object-contain"
            draggable={false}
            style={{ objectPosition: 'center' }}
            onLoad={() => handleImageLoad('Before')}
            onError={(e) => {
              console.error('❌ Before image failed to load:', e);
              console.error('Before image URL:', beforeImage);
              setHasError(true);
              setImagesLoaded(true); // 即使出错也显示界面
            }}
          />
          {/* Before 标签 */}
          <div className="absolute top-4 left-4 bg-gradient-to-r from-slate-600 to-slate-700 text-white px-3 py-1 rounded-lg text-sm font-medium shadow-lg">
            {beforeLabel}
          </div>
        </div>

        {/* 分割线和拖拽手柄 */}
        <div
          ref={sliderRef}
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize z-10"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* 拖拽手柄 */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg border-2 border-slate-300 flex items-center justify-center cursor-col-resize hover:border-indigo-400 transition-colors">
            <div className="flex space-x-0.5">
              <div className="w-0.5 h-4 bg-slate-400"></div>
              <div className="w-0.5 h-4 bg-slate-400"></div>
            </div>
          </div>
        </div>

        {/* 左右箭头指示器 */}
        <div className="absolute top-1/2 left-4 transform -translate-y-1/2 text-white/80 pointer-events-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="absolute top-1/2 right-4 transform -translate-y-1/2 text-white/80 pointer-events-none">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* 底部说明 */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
        <div className="flex justify-between items-center text-white text-sm">
          <span className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
            </svg>
            <span>拖动对比</span>
          </span>
          <span className="text-xs opacity-75">
            {Math.round(sliderPosition)}% / {Math.round(100 - sliderPosition)}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default BeforeAfterSlider;
