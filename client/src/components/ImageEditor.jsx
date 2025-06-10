import { useState, useRef, useEffect } from 'react';
import { editImage, SERVER_BASE_URL } from '../services/api';
import ModelSelector from './ModelSelector';
import BeforeAfterSlider from './BeforeAfterSlider';
import UpscaleButton from './UpscaleButton';

const ImageEditor = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [editedImage, setEditedImage] = useState(null);
  const [upscaledImage, setUpscaledImage] = useState(null);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({
    seed: '',
    safety_tolerance: 2,
    output_format: 'jpeg',
    model: 'flux-kontext-max'  // 默认使用 max 模型
  });
  const fileInputRef = useRef(null);

  // 本地存储键名
  const STORAGE_KEY = 'flux_pro_image_editor_settings';

  // 从本地存储加载设置
  const loadSettings = () => {
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.options) {
          setOptions(prev => ({ ...prev, ...parsedSettings.options }));
        }
        if (parsedSettings.prompt) {
          setPrompt(parsedSettings.prompt);
        }
      }
    } catch (error) {
      console.error('加载图像编辑器设置失败:', error);
    }
  };

  // 保存设置到本地存储
  const saveSettings = () => {
    try {
      const settings = {
        options,
        prompt,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('保存图像编辑器设置失败:', error);
    }
  };

  // 组件挂载时加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  // 当设置变化时保存
  useEffect(() => {
    saveSettings();
  }, [options, prompt]);

  // 图像编辑模式下，安全等级必须 ≤ 2
  const safetyLevels = [
    { value: 0, label: '0 - 最严格' },
    { value: 1, label: '1 - 严格' },
    { value: 2, label: '2 - 标准 (推荐)' }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        setError('请选择图片文件');
        return;
      }

      // 验证文件大小 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('图片文件不能超过 10MB');
        return;
      }

      setSelectedFile(file);
      setError('');
      setEditedImage(null);

      // 创建预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!selectedFile) {
      setError('请先选择一张图片');
      return;
    }

    if (!prompt.trim()) {
      setError('请输入编辑指令');
      return;
    }

    setLoading(true);
    setError('');
    setEditedImage(null);

    try {
      console.log('✏️ 开始编辑图片...');
      const result = await editImage(selectedFile, prompt, options);

      if (result.success) {
        setEditedImage({
          url: `${SERVER_BASE_URL}${result.imageUrl}`,
          originalUrl: result.originalUrl
        });
        console.log('✅ 图片编辑成功');
      } else {
        setError('图片编辑失败');
      }
    } catch (err) {
      console.error('编辑错误:', err);
      setError(err.message || '编辑图片时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const imageToDownload = upscaledImage || editedImage;
    if (imageToDownload) {
      const link = document.createElement('a');
      link.href = imageToDownload.url;
      link.download = `flux-edited-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setEditedImage(null);
    setUpscaledImage(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </div>
        <h2 className="text-2xl font-light text-slate-800 tracking-tight">
          图像编辑
        </h2>
        <p className="text-slate-500 font-light mt-2">
          使用 AI 智能编辑和修改您的图像
        </p>
      </div>

      <div className="space-y-8">
        {/* 文件上传区域 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-4">
            选择图片
          </label>
          <div className="border-2 border-dashed border-slate-300/50 rounded-3xl p-8 text-center hover:border-indigo-400/50 hover:bg-indigo-50/30 transition-all duration-300">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              disabled={loading}
            />
            {!selectedFile ? (
              <div>
                <div className="text-slate-400 mb-4">
                  <svg className="mx-auto h-16 w-16" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-2xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 transform hover:scale-105"
                  disabled={loading}
                >
                  选择图片文件
                </button>
                <p className="text-sm text-slate-500 font-light mt-4">
                  支持 JPG, PNG, GIF, WebP 格式，最大 10MB
                </p>
              </div>
            ) : (
              <div>
                {previewUrl && (
                  <div className="mb-6">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-2xl shadow-lg"
                    />
                  </div>
                )}
                <p className="text-sm text-slate-600 font-medium mb-4">{selectedFile.name}</p>
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-2 bg-white/80 border border-slate-200/50 text-slate-700 font-medium rounded-xl hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                    disabled={loading}
                  >
                    重新选择
                  </button>
                  <button
                    onClick={clearSelection}
                    className="px-6 py-2 bg-white/80 border border-slate-200/50 text-slate-700 font-medium rounded-xl hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
                    disabled={loading}
                  >
                    清除
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 编辑指令输入 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-4">
            编辑指令
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述您想要对图片进行的修改，例如：把汽车颜色改成红色、替换背景为海滩、添加彩虹..."
            className="w-full h-32 px-4 py-3 bg-white/70 border border-slate-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200 resize-none text-slate-700 placeholder-slate-400"
            disabled={loading}
          />
          <div className="mt-4 p-4 bg-slate-50/50 rounded-2xl">
            <p className="font-medium text-slate-700 mb-3">编辑提示：</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-slate-600">对象修改：改变颜色、形状、大小等</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-slate-600">背景替换：描述新的背景场景</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-slate-600">添加元素：在图片中添加新的物体或效果</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-amber-700">内容审核较严格，请使用温和描述</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-emerald-700">推荐：改变颜色、替换背景</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 模型选择 */}
        <ModelSelector
          value={options.model}
          onChange={(model) => setOptions({...options, model})}
          disabled={loading}
        />

        {/* 编辑选项 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              随机种子 (可选)
            </label>
            <input
              type="number"
              value={options.seed}
              onChange={(e) => setOptions({...options, seed: e.target.value ? parseInt(e.target.value) : ''})}
              placeholder="留空使用随机种子"
              className="w-full px-4 py-3 bg-white/70 border border-slate-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200 text-slate-700 placeholder-slate-400"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              安全等级
            </label>
            <select
              value={options.safety_tolerance}
              onChange={(e) => setOptions({...options, safety_tolerance: parseInt(e.target.value)})}
              className="w-full px-4 py-3 bg-white/70 border border-slate-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200 text-slate-700"
              disabled={loading}
            >
              {safetyLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              输出格式
            </label>
            <select
              value={options.output_format}
              onChange={(e) => setOptions({...options, output_format: e.target.value})}
              className="w-full px-4 py-3 bg-white/70 border border-slate-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200 text-slate-700"
              disabled={loading}
            >
              <option value="jpeg">JPEG</option>
              <option value="png">PNG</option>
            </select>
          </div>
        </div>

        {/* 编辑按钮 */}
        <button
          onClick={handleEdit}
          disabled={loading || !selectedFile || !prompt.trim()}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-2xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              编辑中...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              开始编辑
            </div>
          )}
        </button>

        {/* 错误信息 */}
        {error && (
          <div className="bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* 编辑结果 */}
        {editedImage && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-slate-800">
                {upscaledImage ? '高清放大结果对比' : '编辑结果对比'}
              </h3>
              <div className="flex items-center space-x-3">
                {editedImage && !upscaledImage && (
                  <UpscaleButton
                    imageUrl={editedImage.url}
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
                  <span>下载{upscaledImage ? '高清图' : '编辑图'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Before-After Slider */}
              <BeforeAfterSlider
                beforeImage={previewUrl}
                afterImage={upscaledImage ? upscaledImage.url : editedImage.url}
                beforeLabel="原图"
                afterLabel={upscaledImage ? "AI 编辑 + 高清放大" : "AI 编辑"}
                height="600px"
                className="shadow-lg"
              />

              {/* 编辑信息 */}
              <div className="bg-slate-50/50 rounded-2xl p-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="w-5 h-5 text-indigo-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-slate-700 mb-1">编辑提示词</h4>
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
                      拖动滑块查看 AI 编辑前后的对比效果。左侧为原图，右侧为 AI 编辑后的结果。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;
