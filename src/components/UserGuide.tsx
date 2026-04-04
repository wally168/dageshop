'use client'

import React, { useState } from 'react'
import { HelpCircle, X } from 'lucide-react'

export default function UserGuide() {
  const [isOpen, setIsOpen] = useState(false)

  const toggleGuide = () => {
    setIsOpen(!isOpen)
  }

  return (
    <>
      {/* 浮动帮助按钮 */}
      <button
        onClick={toggleGuide}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center"
        title="系统使用说明"
      >
        <HelpCircle size={24} />
      </button>

      {/* 使用说明弹窗 */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            {/* 标题栏 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">系统使用说明</h2>
              <button
                onClick={toggleGuide}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-6">
                {/* 系统概述 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">系统概述</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">
                      这是一个完整的电商管理系统，包含前台展示和后台管理功能。系统支持产品展示、用户管理、内容编辑等核心功能。
                    </p>
                  </div>
                </section>

                {/* 前台功能 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">前台功能</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">产品浏览</h4>
                        <p className="text-gray-600 text-sm">浏览所有产品，查看产品详情和图片</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">导航菜单</h4>
                        <p className="text-gray-600 text-sm">使用顶部导航菜单快速访问不同页面</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 text-sm font-medium">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">联系信息</h4>
                        <p className="text-gray-600 text-sm">通过联系页面获取更多信息或支持</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 后台管理 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">后台管理</h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">1</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">产品管理</h4>
                        <p className="text-gray-600 text-sm">添加、编辑、删除产品信息，设置产品图片和描述</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">2</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">导航设置</h4>
                        <p className="text-gray-600 text-sm">自定义网站导航菜单，调整菜单顺序和链接</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">3</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">首页内容</h4>
                        <p className="text-gray-600 text-sm">编辑首页展示内容，包括标题、描述和特色产品</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 text-sm font-medium">4</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">系统设置</h4>
                        <p className="text-gray-600 text-sm">配置网站名称、描述、关键词等基本信息</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* 邮箱管理 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">邮箱管理</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 入口：后台 → 邮箱管理（或消息列表右上角“邮箱管理”）</li>
                      <li>• 搜索：支持邮箱与姓名关键字</li>
                      <li>• 复制全部：复制当前筛选结果为“用户名,邮箱”，可直接粘贴到表格</li>
                      <li>• 单条复制：逐项复制为“用户名,邮箱”</li>
                      <li>• 下载 CSV：两列“name,email”</li>
                      <li>• 下载 TXT（仅邮箱）：每行一个邮箱</li>
                      <li>• 下载 TXT（用户名,邮箱）：每行“用户名,邮箱”</li>
                      <li>• 接口：/api/emails?format=json | csv | txt | txt_with_name</li>
                    </ul>
                  </div>
                </section>

                {/* 使用技巧 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">使用技巧</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <ul className="space-y-2 text-sm text-gray-700">
                      <li>• 定期备份重要数据，防止意外丢失</li>
                      <li>• 使用清晰的产品图片和描述，提升用户体验</li>
                      <li>• 保持导航菜单简洁明了，便于用户浏览</li>
                      <li>• 及时更新产品信息，确保内容准确性</li>
                    </ul>
                  </div>
                </section>

                {/* 技术支持 */}
                <section>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">技术支持</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2">如遇问题或需要帮助，请联系：</p>
                    <p className="text-sm font-medium text-blue-600">作者：達哥</p>
                    <p className="text-sm text-blue-600">WeChat: DAGEUP6688</p>
                  </div>
                </section>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="border-t p-4 flex justify-end">
              <button
                onClick={toggleGuide}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}