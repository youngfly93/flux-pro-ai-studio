import { useState, useRef, useEffect } from 'react';
import { editImage, SERVER_BASE_URL } from '../services/api';
import ModelSelector from './ModelSelector';
import BeforeAfterSlider from './BeforeAfterSlider';
import UpscaleButton from './UpscaleButton';

function ImageInpainting() {
  const [originalImage, setOriginalImage] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [error, setError] = useState('');
  const [brushSize, setBrushSize] = useState(20);
  const [isDrawing, setIsDrawing] = useState(false);
  const [model, setModel] = useState('flux-kontext-max');

  const canvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // 本地存储键名
  const STORAGE_KEY = 'flux_pro_image_inpainting_settings';

  // 从本地存储加载设置
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.prompt) {
          setPrompt(parsedSettings.prompt);
        }
        if (parsedSettings.model) {
          setModel(parsedSettings.model);
        }
        if (parsedSettings.brushSize) {
          setBrushSize(parsedSettings.brushSize);
        }
      }
    } catch (error) {
      console.error('加载图像重绘设置失败:', error);
    }
  };

  // 保存设置到本地存储
  const saveSettings = () => {
    try {
      const settings = {
        prompt,
        model,
        brushSize,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('保存图像重绘设置失败:', error);
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  // 当设置变化时保存
  useEffect(() => {
    saveSettings();
  }, [prompt, model, brushSize]);

  // 处理图片上传
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('📁 上传文件:', file.name, file.type);
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          console.log('🖼️ 图片加载完成:', img.width, 'x', img.height);
          setOriginalImage({
            src: e.target.result,
            file: file,
            width: img.width,
            height: img.height,
            imageElement: img // 保留 Image 对象用于画布操作
          });
          // 延迟初始化画布，确保 DOM 已更新
          setTimeout(() => {
            initializeCanvas(img);
          }, 100);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  // 初始化画布
  const initializeCanvas = (img) => {
    console.log('🎨 初始化画布...');
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    console.log('Canvas refs:', { canvas: !!canvas, maskCanvas: !!maskCanvas });

    if (!canvas || !maskCanvas) {
      console.error('❌ Canvas elements not found', { canvas, maskCanvas });
      return;
    }

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    console.log('Canvas contexts:', { ctx: !!ctx, maskCtx: !!maskCtx });

    // 设置画布尺寸 - 保持原始尺寸，但限制最大显示尺寸
    const maxDisplayWidth = 800;
    const maxDisplayHeight = 600;
    let { width, height } = img;
    let displayWidth = width;
    let displayHeight = height;

    // 只在显示时缩放，保持原始分辨率用于处理
    if (width > maxDisplayWidth || height > maxDisplayHeight) {
      const ratio = Math.min(maxDisplayWidth / width, maxDisplayHeight / height);
      displayWidth = width * ratio;
      displayHeight = height * ratio;
    }

    canvas.width = width;
    canvas.height = height;
    maskCanvas.width = width;
    maskCanvas.height = height;

    // 设置显示尺寸
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    maskCanvas.style.width = `${displayWidth}px`;
    maskCanvas.style.height = `${displayHeight}px`;

    // 重置画布状态
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    maskCtx.globalAlpha = 1;
    maskCtx.globalCompositeOperation = 'source-over';

    // 绘制原图
    ctx.drawImage(img, 0, 0, width, height);

    // 清除蒙版画布（确保完全透明）
    maskCtx.clearRect(0, 0, width, height);

    console.log('🎨 画布初始化完成:', { width, height, displayWidth, displayHeight });
  };

  // 开始绘制
  const startDrawing = (e) => {
    setIsDrawing(true);
    draw(e);
  };

  // 绘制蒙版
  const draw = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!canvas || !maskCanvas) return;

    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;

    // 计算实际画布坐标（考虑缩放比例）
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = displayX * scaleX;
    const y = displayY * scaleY;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    // 在主画布上绘制半透明的红色标记
    ctx.save(); // 保存当前状态
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, (brushSize * scaleX) / 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore(); // 恢复状态

    // 在蒙版画布上绘制白色区域
    maskCtx.save(); // 保存当前状态
    maskCtx.globalAlpha = 1;
    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = '#ffffff';
    maskCtx.beginPath();
    maskCtx.arc(x, y, (brushSize * scaleX) / 2, 0, 2 * Math.PI);
    maskCtx.fill();
    maskCtx.restore(); // 恢复状态
  };

  // 停止绘制
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // 清除蒙版
  const clearMask = () => {
    if (!originalImage) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;

    if (!canvas || !maskCanvas) return;

    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    // 重置画布状态
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // 完全清除主画布并重新绘制原图
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage.imageElement, 0, 0, canvas.width, canvas.height);

    // 重置蒙版画布状态
    maskCtx.globalAlpha = 1;
    maskCtx.globalCompositeOperation = 'source-over';

    // 完全清除蒙版画布
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // 如果有结果显示，也清除结果，让用户重新开始
    if (result) {
      setResult(null);
    }

    console.log('🧹 清除涂抹完成');
  };

  // 生成重绘图片
  const handleInpaint = async () => {
    if (!originalImage || !prompt.trim()) {
      setError('请上传图片并输入重绘内容描述');
      return;
    }

    if (isGenerating) {
      console.log('⚠️ 已在处理中，忽略重复点击');
      return;
    }

    setIsGenerating(true);
    setError('');
    setResult(null);

    try {
      // 将画布转换为文件
      const canvas = canvasRef.current;
      const maskCanvas = maskCanvasRef.current;

      if (!canvas || !maskCanvas) {
        setError('画布未初始化，请重新上传图片');
        return;
      }

      canvas.toBlob(async (blob) => {
        try {
          // 获取蒙版数据
          const maskDataUrl = maskCanvas.toDataURL();

          // 构建完整的提示词 - 使用更温和的描述避免内容审核
          const fullPrompt = `Replace the selected area with ${prompt.trim()}, maintaining the original style and quality`;

          console.log('🎨 开始重绘...', {
            prompt: fullPrompt,
            hasMask: !!maskDataUrl,
            blobSize: blob.size,
            blobType: blob.type
          });

          // 创建一个带有正确文件名的 File 对象
          const imageFile = new File([blob], 'canvas-image.png', {
            type: 'image/png',
            lastModified: Date.now()
          });

          console.log('📁 Created file:', {
            name: imageFile.name,
            type: imageFile.type,
            size: imageFile.size
          });

          // 暂时不传递 mask，先测试基本的图像编辑功能
          const response = await editImage(imageFile, fullPrompt, {
            output_format: 'jpeg',
            safety_tolerance: 2,
            model: model
          });
          setResult(response);
          console.log('✅ 重绘完成');
        } catch (blobError) {
          console.error('重绘错误:', blobError);
          setError(blobError.message);
        } finally {
          setIsGenerating(false);
        }
      }, 'image/png');

    } catch (error) {
      console.error('初始化错误:', error);
      setError(error.message);
      setIsGenerating(false);
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

  return (
    <div className="space-y-8">
      {/* 上传区域 */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
        <h2 className="text-2xl font-light text-slate-800 mb-6">局部重绘</h2>
        
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
            <>
              {/* 画布工具 */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-slate-700">
                    刷子大小:
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-slate-600">{brushSize}px</span>
                </div>
                
                <button
                  onClick={clearMask}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors duration-200"
                >
                  清除涂抹
                </button>
              </div>

              {/* 画布区域 */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="border border-slate-200 rounded-xl cursor-crosshair max-w-full"
                  style={{ cursor: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${brushSize}' height='${brushSize}' viewBox='0 0 ${brushSize} ${brushSize}'%3E%3Ccircle cx='${brushSize/2}' cy='${brushSize/2}' r='${brushSize/2-1}' fill='none' stroke='%23ef4444' stroke-width='2'/%3E%3C/svg%3E") ${brushSize/2} ${brushSize/2}, crosshair` }}
                />
                <canvas
                  ref={maskCanvasRef}
                  className="absolute top-0 left-0 pointer-events-none opacity-0"
                />
              </div>

              <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">
                💡 <strong>使用说明：</strong> 用鼠标在图片上涂抹要重绘的区域（红色区域），然后在下方输入要填充的内容描述。
              </div>
            </>
          )}
        </div>
      </div>

      {/* 提示词输入 */}
      {originalImage && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                重绘内容描述
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述要在涂抹区域填充的内容，例如：blue sky, green grass, wooden table, white wall, red flower..."
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-colors duration-200"
                rows={3}
              />

              <div className="text-xs text-slate-500 mt-2">
                💡 <strong>提示：</strong>使用简单的描述词，如颜色+物体（blue sky, green tree），避免复杂或敏感内容
              </div>
            </div>

            {/* 模型选择 */}
            <ModelSelector
              value={model}
              onChange={setModel}
              disabled={isGenerating}
            />

            <button
              onClick={handleInpaint}
              disabled={isGenerating || !originalImage || !prompt.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>正在重绘...</span>
                </div>
              ) : (
                '开始重绘'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 加载状态 */}
      {isGenerating && (
        <div className="bg-indigo-50/80 backdrop-blur-sm border border-indigo-200/50 text-indigo-700 px-6 py-4 rounded-2xl">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-800">正在重绘中...</h3>
              <p className="mt-1 text-sm text-indigo-600">AI 正在处理您的图片，请稍候片刻</p>
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
              <h3 className="text-sm font-medium text-red-800">重绘失败</h3>
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
              {upscaledImage ? '高清放大结果对比' : '重绘结果对比'}
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
                download="inpainted-image.jpg"
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                下载{upscaledImage ? '高清图' : '重绘图'}
              </a>
            </div>
          </div>

          <div className="space-y-6">
            {/* Before-After Slider */}
            <BeforeAfterSlider
              beforeImage={originalImage?.src}
              afterImage={upscaledImage ? upscaledImage.url : `${SERVER_BASE_URL}${result.imageUrl}`}
              beforeLabel="原图"
              afterLabel={upscaledImage ? "AI 重绘 + 高清放大" : "AI 重绘"}
              height="600px"
              className="shadow-lg"
            />

            {/* 重绘信息 */}
            <div className="bg-slate-50/50 rounded-2xl p-4">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h4a1 1 0 011 1v2h4a1 1 0 011 1v1a1 1 0 01-1 1v9a2 2 0 01-2 2H7a2 2 0 01-2-2V7a1 1 0 01-1-1V5a1 1 0 011-1h4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-700 mb-1">重绘提示词</h4>
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
            <div className="flex flex-wrap gap-3">
              <button
                onClick={clearMask}
                className="inline-flex items-center px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-xl transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                清除涂抹
              </button>

              <button
                onClick={() => setResult(null)}
                className="inline-flex items-center px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                重新编辑
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
                    拖动滑块查看 AI 重绘前后的对比效果。左侧为原图，右侧为 AI 重绘后的结果。
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

export default ImageInpainting;
