# 🎨 Flux AI Studio

一个基于 Flux Kontext Pro API 的现代化 AI 图片生成和编辑 Web 应用。

## ✨ 功能特性

### 🎨 AI 图片生成
- **文本生成图片**: 通过自然语言描述生成高质量图片
- **多种宽高比**: 支持 1:1、16:9、9:16、4:3、3:4 等比例
- **格式选择**: 支持 JPEG 和 PNG 输出格式
- **实时进度**: 显示生成进度和状态

### ✏️ AI 图片编辑
- **智能编辑**: 上传图片并通过文本指令进行编辑
- **对象修改**: 改变颜色、形状、大小等属性
- **文字替换**: 直接编辑图片中的文字内容
- **背景替换**: 更换图片背景场景
- **元素添加**: 在图片中添加新的物体或效果

### 🔧 技术特性
- **现代化界面**: 使用 React + Tailwind CSS 构建
- **响应式设计**: 完美适配桌面和移动设备
- **实时状态监控**: 显示服务器连接状态
- **错误处理**: 完善的错误提示和处理机制
- **图片下载**: 支持生成和编辑结果的下载

## 🚀 快速开始

### 环境要求
- Node.js 16+ 
- npm 或 yarn

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd flux_pro
```

2. **安装依赖**
```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

3. **配置环境变量**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入你的 Flux API Key
nano .env
```

在 `.env` 文件中配置：
```env
BFL_API_KEY=your_flux_api_key_here
BFL_API_BASE_URL=https://api.bfl.ai
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

> 💡 **获取 API Key**: 访问 [Black Forest Labs](https://api.bfl.ai) 注册并获取你的 API Key

4. **启动应用**

**方式一：分别启动前后端**
```bash
# 启动后端服务器 (终端1)
npm run server

# 启动前端开发服务器 (终端2)
npm run client
```

**方式二：使用单独命令**
```bash
# 启动后端
npm start

# 启动前端 (新终端)
cd client && npm run dev
```

5. **访问应用**
- 前端: http://localhost:5173
- 后端 API: http://localhost:3001

## 📖 使用指南

### 图片生成
1. 在"图片生成"标签页中输入图片描述
2. 选择所需的宽高比和输出格式
3. 点击"生成图片"按钮
4. 等待生成完成，可下载结果

**示例提示词：**
- `一只可爱的小猫坐在花园里，阳光明媚`
- `未来科技城市的夜景，霓虹灯闪烁`
- `抽象艺术风格的彩色几何图形`

### 图片编辑
1. 在"图片编辑"标签页中上传图片
2. 输入编辑指令描述想要的修改
3. 点击"开始编辑"按钮
4. 查看编辑前后对比，可下载结果

**编辑指令示例：**
- `把汽车颜色改成红色`
- `将背景替换为海滩场景`
- `将'Hello'替换为'你好'` (文字替换)
- `添加彩虹效果`

## 🛠 项目结构

```
flux_pro/
├── server/                 # Node.js 后端
│   ├── app.js             # Express 服务器主文件
│   ├── routes/            # API 路由
│   │   └── imageRoutes.js # 图片相关路由
│   ├── services/          # 服务层
│   │   └── fluxService.js # Flux API 集成
│   └── uploads/           # 上传和生成的图片
├── client/                # React 前端
│   ├── src/
│   │   ├── components/    # React 组件
│   │   │   ├── ImageGenerator.jsx
│   │   │   └── ImageEditor.jsx
│   │   ├── services/      # API 调用服务
│   │   │   └── api.js
│   │   ├── App.jsx        # 主应用组件
│   │   └── main.jsx       # 应用入口
│   ├── tailwind.config.js # Tailwind 配置
│   └── package.json
├── .env                   # 环境变量配置
├── package.json           # 项目配置
└── README.md             # 项目说明
```

## 🔧 API 端点

### 后端 API
- `GET /api/health` - 健康检查
- `POST /api/images/generate` - 生成图片
- `POST /api/images/edit` - 编辑图片
- `GET /api/images/status/:requestId` - 查询请求状态

### Flux API 集成
- 使用 `/flux-kontext-pro` 端点进行图片生成和编辑
- 自动轮询结果状态直到完成
- 处理图片下载和本地存储

## 🎯 技术栈

**后端:**
- Node.js + Express
- Multer (文件上传)
- Axios (HTTP 客户端)
- Flux Kontext Pro API

**前端:**
- React 18
- Vite (构建工具)
- Tailwind CSS (样式框架)
- Axios (API 调用)

## 🔑 环境配置

### API Key 配置
1. 访问 [Black Forest Labs API](https://api.bfl.ai) 注册账号
2. 获取你的 Flux API Key
3. 复制 `.env.example` 为 `.env`
4. 在 `.env` 文件中填入你的 API Key

### 环境变量说明
- `BFL_API_KEY`: Flux API 密钥（必需）
- `BFL_API_BASE_URL`: API 基础URL（默认：https://api.bfl.ai）
- `PORT`: 后端服务器端口（默认：3001）
- `NODE_ENV`: 运行环境（development/production）
- `CLIENT_URL`: 前端URL（默认：http://localhost:5173）

## 📝 注意事项

1. **API 限制**: Flux API 有使用限制，请合理使用
2. **图片大小**: 上传图片不能超过 10MB
3. **生成时间**: 图片生成通常需要 30-60 秒
4. **网络要求**: 需要稳定的网络连接访问 Flux API
5. **环境变量**: 请勿将 `.env` 文件提交到版本控制系统

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

ISC License
