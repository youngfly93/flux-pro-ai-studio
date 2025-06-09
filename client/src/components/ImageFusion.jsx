import { useState, useRef } from 'react';
import { fuseImages, SERVER_BASE_URL } from '../services/api';
import ModelSelector from './ModelSelector';
import BeforeAfterSlider from './BeforeAfterSlider';
import UpscaleButton from './UpscaleButton';

const ImageFusion = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [fusedImage, setFusedImage] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [error, setError] = useState('');
  const [stitchedPreview, setStitchedPreview] = useState(null);
  const [layoutMode, setLayoutMode] = useState('horizontal'); // horizontal, vertical, grid
  const [borderWidth, setBorderWidth] = useState(20); // 图片间边界宽度
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  
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

  const layoutModes = [
    { value: 'horizontal', label: '水平拼接', icon: '⬌' },
    { value: 'vertical', label: '垂直拼接', icon: '⬍' },
    { value: 'grid', label: '网格拼接', icon: '⊞' }
  ];

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);

    // 验证文件类型
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      setError('请只选择图片文件');
      return;
    }

    // 检查是否会超过最大数量
    const totalFiles = selectedFiles.length + validFiles.length;
    if (totalFiles > 4) {
      setError(`最多支持 4 张图片，当前已有 ${selectedFiles.length} 张，最多还能添加 ${4 - selectedFiles.length} 张`);
      return;
    }

    // 添加到现有文件列表
    const newFiles = [...selectedFiles, ...validFiles];
    setSelectedFiles(newFiles);
    setError('');

    // 生成新的预览 URL（保留现有的，添加新的）
    const newUrls = validFiles.map(file => URL.createObjectURL(file));
    const allUrls = [...previewUrls, ...newUrls];
    setPreviewUrls(allUrls);

    // 自动生成拼接预览
    generateStitchedPreview(newFiles, allUrls, layoutMode);

    // 清空文件输入，允许重复选择
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);

    // 释放被移除图片的 URL
    URL.revokeObjectURL(previewUrls[index]);

    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
    setError('');

    // 如果还有图片，重新生成拼接预览
    if (newFiles.length > 0) {
      generateStitchedPreview(newFiles, newUrls, layoutMode);
    } else {
      setStitchedPreview(null);
    }
  };

  const generateStitchedPreview = async (files, urls, layout = layoutMode) => {
    if (files.length < 2) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 加载所有图片
    const images = await Promise.all(
      urls.map(url => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = url;
        });
      })
    );

    // 计算画布尺寸和布局
    let canvasWidth, canvasHeight;
    const maxSize = 512; // 预览最大尺寸
    const currentBorderWidth = borderWidth; // 使用状态中的边界宽度

    if (layout === 'horizontal') {
      // 水平拼接：所有图片等高，宽度相加，加上边界
      const targetHeight = Math.min(maxSize, Math.max(...images.map(img => img.height)));
      canvasHeight = targetHeight;
      canvasWidth = images.reduce((total, img) => {
        const scaledWidth = (img.width * targetHeight) / img.height;
        return total + scaledWidth;
      }, 0) + (images.length - 1) * currentBorderWidth; // 添加边界宽度
    } else if (layout === 'vertical') {
      // 垂直拼接：所有图片等宽，高度相加，加上边界
      const targetWidth = Math.min(maxSize, Math.max(...images.map(img => img.width)));
      canvasWidth = targetWidth;
      canvasHeight = images.reduce((total, img) => {
        const scaledHeight = (img.height * targetWidth) / img.width;
        return total + scaledHeight;
      }, 0) + (images.length - 1) * currentBorderWidth; // 添加边界高度
    } else {
      // 网格拼接：2x2 或 2x1 布局，加上边界
      const cols = Math.ceil(Math.sqrt(images.length));
      const rows = Math.ceil(images.length / cols);
      const cellSize = maxSize / Math.max(cols, rows);
      canvasWidth = cols * cellSize + (cols - 1) * currentBorderWidth;
      canvasHeight = rows * cellSize + (rows - 1) * currentBorderWidth;
    }

    // 设置画布尺寸
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // 清空画布，使用白色背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 绘制图片
    let currentX = 0;
    let currentY = 0;

    images.forEach((img, index) => {
      let drawX, drawY, drawWidth, drawHeight;

      if (layout === 'horizontal') {
        drawHeight = canvasHeight;
        drawWidth = (img.width * drawHeight) / img.height;
        drawX = currentX;
        drawY = 0;
        currentX += drawWidth + currentBorderWidth; // 添加边界宽度
      } else if (layout === 'vertical') {
        drawWidth = canvasWidth;
        drawHeight = (img.height * drawWidth) / img.width;
        drawX = 0;
        drawY = currentY;
        currentY += drawHeight + currentBorderWidth; // 添加边界高度
      } else {
        // 网格布局
        const cols = Math.ceil(Math.sqrt(images.length));
        const cellWidth = (canvasWidth - (cols - 1) * currentBorderWidth) / cols;
        const cellHeight = (canvasHeight - (Math.ceil(images.length / cols) - 1) * currentBorderWidth) / Math.ceil(images.length / cols);

        const col = index % cols;
        const row = Math.floor(index / cols);

        drawX = col * (cellWidth + currentBorderWidth);
        drawY = row * (cellHeight + currentBorderWidth);
        drawWidth = cellWidth;
        drawHeight = cellHeight;
      }

      // 绘制图片
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // 绘制图片边框（可选，让边界更明显）
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
    });

    // 生成预览图片
    const previewDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setStitchedPreview(previewDataUrl);
  };

  const handleLayoutChange = (newLayout) => {
    setLayoutMode(newLayout);
    if (selectedFiles.length > 0) {
      generateStitchedPreview(selectedFiles, previewUrls, newLayout);
    }
  };

  const handleFusion = async () => {
    if (selectedFiles.length < 2) {
      setError('请至少选择 2 张图片');
      return;
    }

    if (!prompt.trim()) {
      setError('请输入融合描述');
      return;
    }

    setLoading(true);
    setError('');
    setFusedImage(null);
    setUpscaledImage(null);

    try {
      console.log('🎨 开始多图片融合...');
      
      // 生成最终的拼接图片
      const canvas = canvasRef.current;
      const finalStitchedBlob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });

      const stitchedFile = new File([finalStitchedBlob], 'stitched-images.jpg', {
        type: 'image/jpeg',
        lastModified: Date.now()
      });

      const result = await fuseImages(stitchedFile, prompt, options);
      
      if (result.success) {
        setFusedImage({
          url: `${SERVER_BASE_URL}${result.imageUrl}`,
          originalUrl: result.originalUrl
        });
        console.log('✅ 图片融合成功');
      } else {
        setError('图片融合失败');
      }
    } catch (err) {
      console.error('融合错误:', err);
      setError(err.message || '融合图片时发生错误');
    } finally {
      setLoading(false);
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

  const handleDownload = () => {
    const imageToDownload = upscaledImage || fusedImage;
    if (imageToDownload) {
      const link = document.createElement('a');
      link.href = imageToDownload.url;
      link.download = `flux-fused-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const clearSelection = () => {
    // 释放所有预览 URL 资源
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    setSelectedFiles([]);
    setPreviewUrls([]);
    setFusedImage(null);
    setUpscaledImage(null);
    setStitchedPreview(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* 标题和说明 */}
      <div className="text-center">
        <h2 className="text-3xl font-light text-slate-800 mb-4">🎭 多图片融合</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          上传多张图片，通过 AI 智能融合创造全新的艺术作品。支持风格统一、场景合成、创意拼贴等多种融合方式。
        </p>
      </div>

      {/* 图片上传区域 */}
      <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-slate-800">📸 选择图片 (2-4张)</h3>
          {selectedFiles.length > 0 && (
            <span className="text-sm text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              已选择 {selectedFiles.length}/4 张
            </span>
          )}
        </div>

        <div className="space-y-6">
          {/* 文件选择 */}
          <div className="flex items-center justify-center w-full">
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-2xl cursor-pointer transition-colors ${
              selectedFiles.length >= 4
                ? 'border-slate-200 bg-slate-50/30 cursor-not-allowed'
                : 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50'
            }`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mb-2 text-sm text-slate-500">
                  <span className="font-semibold">
                    {selectedFiles.length === 0 ? '点击上传' : '继续添加'}
                  </span> 或拖拽图片到此处
                </p>
                <p className="text-xs text-slate-500">
                  {selectedFiles.length >= 4
                    ? '已达到最大数量 (4张)'
                    : `支持 PNG, JPG, WEBP (还可添加 ${4 - selectedFiles.length} 张)`
                  }
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                disabled={selectedFiles.length >= 4}
                className="hidden"
              />
            </label>
          </div>

          {/* 布局模式选择 */}
          {selectedFiles.length > 0 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">拼接布局</label>
                <div className="grid grid-cols-3 gap-3">
                  {layoutModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => handleLayoutChange(mode.value)}
                      className={`p-3 rounded-xl border-2 transition-all duration-200 ${
                        layoutMode === mode.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{mode.icon}</div>
                      <div className="text-sm font-medium">{mode.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 边界宽度设置 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  图片间距 ({borderWidth}px)
                </label>
                <div className="space-y-3">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={borderWidth}
                    onChange={(e) => {
                      const newBorderWidth = parseInt(e.target.value);
                      setBorderWidth(newBorderWidth);
                      if (selectedFiles.length > 0) {
                        generateStitchedPreview(selectedFiles, previewUrls, layoutMode);
                      }
                    }}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>无间距</span>
                    <span>小间距</span>
                    <span>中间距</span>
                    <span>大间距</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[0, 10, 20, 30, 40].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setBorderWidth(preset);
                          if (selectedFiles.length > 0) {
                            generateStitchedPreview(selectedFiles, previewUrls, layoutMode);
                          }
                        }}
                        className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                          borderWidth === preset
                            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {preset === 0 ? '无' : `${preset}px`}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    💡 提示：较大的间距能帮助 AI 更好地识别这是多张拼接的图片
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 隐藏的画布用于图片拼接 */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* 图片预览和拼接预览 */}
      {selectedFiles.length > 0 && (
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
          <h3 className="text-lg font-medium text-slate-800 mb-6">🖼️ 图片预览</h3>
          
          <div className="space-y-6">
            {/* 原始图片预览 */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-3">原始图片 ({selectedFiles.length}张)</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`预览 ${index + 1}`}
                      className="w-full h-24 object-cover rounded-xl border border-slate-200"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />

                    {/* 图片序号 */}
                    <div className="absolute top-2 right-2 bg-white/90 text-slate-700 text-xs px-2 py-1 rounded-lg">
                      {index + 1}
                    </div>

                    {/* 删除按钮 */}
                    <button
                      onClick={() => removeImage(index)}
                      className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title="删除这张图片"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* 添加更多图片的占位符 */}
                {selectedFiles.length < 4 && (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-slate-400 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="text-center">
                      <svg className="w-6 h-6 text-slate-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-xs text-slate-500">添加图片</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 拼接预览 */}
            {stitchedPreview && (
              <div>
                <h4 className="text-sm font-medium text-slate-700 mb-3">拼接预览</h4>
                <div className="flex justify-center">
                  <img
                    src={stitchedPreview}
                    alt="拼接预览"
                    className="max-w-full max-h-64 object-contain rounded-xl border border-slate-200 shadow-lg"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 提示信息 - 当只有1张图片时 */}
      {selectedFiles.length === 1 && (
        <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/50 text-blue-700 px-6 py-4 rounded-2xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">需要更多图片</h3>
              <p className="mt-1 text-sm text-blue-600">
                请再添加至少 1 张图片才能开始融合。您可以点击上方的"继续添加"或"添加图片"按钮。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 融合设置 */}
      {selectedFiles.length >= 2 && (
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
          <h3 className="text-lg font-medium text-slate-800 mb-6">🎨 融合设置</h3>

          <div className="space-y-6">
            {/* 融合描述 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                融合描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要的融合效果，例如：将这些图片融合成一个梦幻的风景画，统一为水彩画风格..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                rows={3}
                disabled={loading}
              />
              <p className="mt-2 text-xs text-slate-500">
                💡 提示：描述越详细，融合效果越好。可以指定风格、主题、色调等
              </p>
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
                onClick={handleFusion}
                disabled={loading || selectedFiles.length < 2 || !prompt.trim()}
                className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>融合中...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                    <span>开始融合</span>
                  </div>
                )}
              </button>

              {selectedFiles.length > 0 && (
                <button
                  onClick={clearSelection}
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

      {/* 融合结果 */}
      {fusedImage && (
        <div className="bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-3xl p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-slate-800">
              {upscaledImage ? '高清放大结果' : '融合结果'}
            </h3>
            <div className="flex items-center space-x-3">
              {fusedImage && !upscaledImage && (
                <UpscaleButton
                  imageUrl={fusedImage.url}
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
                <span>下载{upscaledImage ? '高清图' : '融合图'}</span>
              </button>
            </div>
          </div>

          {/* 对比显示 */}
          {stitchedPreview && (
            <BeforeAfterSlider
              beforeImage={stitchedPreview}
              afterImage={upscaledImage ? upscaledImage.url : fusedImage.url}
              beforeLabel="拼接原图"
              afterLabel={upscaledImage ? "AI 融合 + 高清放大" : "AI 融合"}
              height="600px"
              className="shadow-lg"
            />
          )}

          {/* 融合信息 */}
          <div className="mt-6 bg-slate-50/50 rounded-2xl p-4">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">融合描述</h4>
                  <p className="text-sm text-slate-600 font-light">{prompt}</p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-slate-700 mb-1">处理信息</h4>
                  <p className="text-sm text-slate-600 font-light">
                    {selectedFiles.length} 张图片 • {layoutMode === 'horizontal' ? '水平拼接' : layoutMode === 'vertical' ? '垂直拼接' : '网格拼接'} • {options.model}
                  </p>
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
        </div>
      )}
    </div>
  );
};

export default ImageFusion;
