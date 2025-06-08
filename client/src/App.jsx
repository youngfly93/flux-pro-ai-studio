import { useState, useEffect } from 'react';
import ImageGenerator from './components/ImageGenerator';
import ImageEditor from './components/ImageEditor';
import ImageInpainting from './components/ImageInpainting';
import ImageExpander from './components/ImageExpander';
import ImageUpscaler from './components/ImageUpscaler';
import ImageFusion from './components/ImageFusion';
import { healthCheck } from './services/api';

function App() {
  const [activeTab, setActiveTab] = useState('generate');
  const [serverStatus, setServerStatus] = useState('checking');

  useEffect(() => {
    // 检查服务器状态
    const checkServer = async () => {
      try {
        await healthCheck();
        setServerStatus('online');
      } catch (error) {
        setServerStatus('offline');
        console.error('服务器连接失败:', error);
      }
    };

    checkServer();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* 头部 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-light text-slate-800 tracking-tight">
                  AI Studio
                </h1>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  serverStatus === 'online' ? 'bg-emerald-500' :
                  serverStatus === 'offline' ? 'bg-red-500' : 'bg-amber-500'
                }`}></div>
                <span className="text-sm text-slate-500 font-light">
                  {serverStatus === 'online' ? '在线' :
                   serverStatus === 'offline' ? '离线' : '连接中'}
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-400 font-light">
              Powered by Flux Pro
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容 */}
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        {/* 标签页导航 */}
        <div className="flex justify-center mb-16">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2">
            <button
              onClick={() => setActiveTab('generate')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'generate'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              图像生成
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'edit'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              图像编辑
            </button>
            <button
              onClick={() => setActiveTab('inpaint')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'inpaint'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              局部重绘
            </button>
            <button
              onClick={() => setActiveTab('expand')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'expand'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              AI 扩图
            </button>
            <button
              onClick={() => setActiveTab('fusion')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'fusion'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              多图融合
            </button>
            <button
              onClick={() => setActiveTab('upscale')}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                activeTab === 'upscale'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              高清放大
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div>
          {serverStatus === 'offline' && (
            <div className="mb-8 bg-red-50/80 backdrop-blur-sm border border-red-200/50 text-red-700 px-6 py-4 rounded-2xl">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">服务器连接失败</h3>
                  <p className="mt-1 text-sm text-red-600">
                    请确保后端服务器正在运行。运行命令: <code className="bg-red-100/80 px-2 py-1 rounded-lg font-mono text-xs">npm run server</code>
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'generate' && <ImageGenerator />}
          {activeTab === 'edit' && <ImageEditor />}
          {activeTab === 'inpaint' && <ImageInpainting />}
          {activeTab === 'expand' && <ImageExpander />}
          {activeTab === 'fusion' && <ImageFusion />}
          {activeTab === 'upscale' && <ImageUpscaler />}
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-white/50 backdrop-blur-sm border-t border-slate-200/50 mt-24">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-slate-500 font-light">
              基于 Flux Kontext Pro API 构建 · 支持专业级图像生成与编辑
            </p>
            <p className="mt-2">
              <a
                href="https://docs.bfl.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-500 font-medium transition-colors duration-200"
              >
                查看 API 文档 →
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
