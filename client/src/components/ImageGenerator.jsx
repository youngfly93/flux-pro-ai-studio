import { useState } from 'react';
import { generateImage, SERVER_BASE_URL } from '../services/api';
import ModelSelector from './ModelSelector';

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [error, setError] = useState('');
  const [options, setOptions] = useState({
    aspect_ratio: '1:1',
    output_format: 'jpeg',
    seed: '',
    prompt_upsampling: false,
    safety_tolerance: 2,
    model: 'flux-kontext-max'  // 默认使用 max 模型
  });

  const aspectRatios = [
    { value: '1:1', label: '1:1 (正方形)' },
    { value: '7:3', label: '7:3 (超宽屏)' },
    { value: '16:9', label: '16:9 (横屏)' },
    { value: '4:3', label: '4:3 (传统横屏)' },
    { value: '3:4', label: '3:4 (肖像)' },
    { value: '9:16', label: '9:16 (竖屏)' },
    { value: '3:7', label: '3:7 (超高竖屏)' }
  ];

  const safetyLevels = [
    { value: 0, label: '0 - 最严格' },
    { value: 1, label: '1 - 严格' },
    { value: 2, label: '2 - 标准 (推荐)' }
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('请输入图片描述');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedImage(null);

    try {
      console.log('🎨 开始生成图片...');
      const result = await generateImage(prompt, options);
      
      if (result.success) {
        setGeneratedImage({
          url: `${SERVER_BASE_URL}${result.imageUrl}`,
          originalUrl: result.originalUrl
        });
        console.log('✅ 图片生成成功');
      } else {
        setError('图片生成失败');
      }
    } catch (err) {
      console.error('生成错误:', err);
      setError(err.message || '生成图片时发生错误');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage.url;
      link.download = `flux-generated-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
          </svg>
        </div>
        <h2 className="text-2xl font-light text-slate-800 tracking-tight">
          图像生成
        </h2>
        <p className="text-slate-500 font-light mt-2">
          使用 AI 将您的想象转化为精美图像
        </p>
      </div>

      <div className="space-y-6">
        {/* 提示词输入 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">
            图片描述
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述您想要生成的图片，例如：一只可爱的小猫坐在花园里，阳光透过树叶洒下..."
            className="w-full h-28 px-4 py-3 bg-white/70 border border-slate-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200 resize-none text-slate-700 placeholder-slate-400"
            disabled={loading}
          />
        </div>

        {/* 模型选择 */}
        <ModelSelector
          value={options.model}
          onChange={(model) => setOptions({...options, model})}
          disabled={loading}
        />

        {/* 选项设置 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              宽高比
            </label>
            <select
              value={options.aspect_ratio}
              onChange={(e) => setOptions({...options, aspect_ratio: e.target.value})}
              className="w-full px-4 py-3 bg-white/70 border border-slate-200/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all duration-200 text-slate-700"
              disabled={loading}
            >
              {aspectRatios.map(ratio => (
                <option key={ratio.value} value={ratio.value}>
                  {ratio.label}
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
        </div>

        {/* 高级选项 */}
        <div className="border-t border-slate-200/50 pt-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">高级选项</h3>
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="prompt_upsampling"
              checked={options.prompt_upsampling}
              onChange={(e) => setOptions({...options, prompt_upsampling: e.target.checked})}
              className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 focus:ring-2"
              disabled={loading}
            />
            <label htmlFor="prompt_upsampling" className="text-sm text-slate-600 font-light">
              提示词增强 (可能提高生成质量，但会增加处理时间)
            </label>
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full py-4 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-2xl hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              生成中...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              生成图片
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

        {/* 生成的图片 */}
        {generatedImage && (
          <div className="mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-slate-800">生成结果</h3>
              <button
                onClick={handleDownload}
                className="px-6 py-2 bg-white/80 border border-slate-200/50 text-slate-700 font-medium rounded-xl hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
              >
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>下载</span>
                </div>
              </button>
            </div>
            <div className="bg-white/50 border border-slate-200/50 rounded-3xl overflow-hidden shadow-lg">
              <img
                src={generatedImage.url}
                alt="Generated"
                className="w-full h-auto"
                onError={(e) => {
                  console.error('图片加载失败');
                  setError('图片加载失败');
                }}
              />
            </div>
            <div className="mt-4 p-4 bg-slate-50/50 rounded-2xl">
              <p className="text-sm text-slate-600 font-light">
                <span className="font-medium">提示词:</span> {prompt}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;
