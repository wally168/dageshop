'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Mail, 
  Search, 
  Trash2, 
  Eye, 
  Calendar,
  User,
  MessageSquare,
  ArrowLeft,
  RefreshCw,
  Download
} from 'lucide-react'

interface Message {
  id: string
  name: string
  email: string
  subject?: string
  country?: string
  orderNo?: string
  message: string
  read: boolean
  createdAt: string
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [forwardEmail, setForwardEmail] = useState('')
  const [forwardEnabled, setForwardEnabled] = useState(false)
  const [forwardLoading, setForwardLoading] = useState(true)
  const [forwardSaving, setForwardSaving] = useState(false)

  useEffect(() => {
    fetchMessages()
    fetchForwardSettings()
  }, [])

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages')
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      } else {
        console.error('获取消息失败')
      }
    } catch (error) {
      console.error('获取消息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchForwardSettings = async () => {
    setForwardLoading(true)
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setForwardEmail(String(data.messageForwardEmail || ''))
        setForwardEnabled(String(data.messageForwardEnabled || '').toLowerCase() === 'true')
      }
    } catch (error) {
      console.error('获取转发设置失败:', error)
    } finally {
      setForwardLoading(false)
    }
  }

  const deleteMessage = async (id: string) => {
    if (!confirm('确定要删除这条消息吗？')) return

    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessages(messages.filter(msg => msg.id !== id))
        setSelectedIds(prev => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        if (selectedMessage?.id === id) {
          setSelectedMessage(null)
        }
        alert('消息删除成功')
      } else {
        alert('删除失败')
      }
    } catch (error) {
      console.error('删除消息失败:', error)
      alert('删除失败')
    }
  }

  const saveForwardSettings = async () => {
    setForwardSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageForwardEmail: forwardEmail || '',
          messageForwardEnabled: forwardEnabled ? 'true' : 'false'
        })
      })
      if (response.ok) {
        alert('留言转发设置已保存')
      } else {
        alert('保存失败')
      }
    } catch (error) {
      console.error('保存转发设置失败:', error)
      alert('保存失败')
    } finally {
      setForwardSaving(false)
    }
  }

  const updateProcessed = async (id: string, read: boolean) => {
    try {
      const response = await fetch(`/api/messages/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read })
      })
      if (response.ok) {
        const updated = await response.json()
        setMessages(messages.map(msg => msg.id === id ? updated : msg))
        if (selectedMessage?.id === id) {
          setSelectedMessage(updated)
        }
      } else {
        alert('更新失败')
      }
    } catch (error) {
      console.error('更新消息失败:', error)
      alert('更新失败')
    }
  }

  const filteredMessages = messages.filter(message =>
    message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    message.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (message.country || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (message.orderNo || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const selectedCount = selectedIds.size
  const allFilteredSelected = filteredMessages.length > 0 && filteredMessages.every(m => selectedIds.has(m.id))

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(prev => {
      const next = new Set(prev)
      filteredMessages.forEach(m => next.add(m.id))
      return next
    })
  }

  const escapeCsvCell = (value: string) => {
    const text = String(value ?? '')
    const needsQuote = /[",\n]/.test(text)
    if (!needsQuote) return text
    return '"' + text.replace(/"/g, '""') + '"'
  }

  const buildCsv = (list: Message[]) => {
    const header = 'name,email,message,createdAt,country,orderNo'
    const rows = list.map(m => [
      m.name || '',
      m.email || '',
      m.message || '',
      m.createdAt ? new Date(m.createdAt).toISOString() : '',
      m.country || '',
      m.orderNo || ''
    ].map(escapeCsvCell).join(',')).join('\n')
    return `${header}\n${rows}`
  }

  const downloadCsv = (list: Message[], filename: string) => {
    if (list.length === 0) {
      alert('没有可导出的消息')
      return
    }
    const csv = buildCsv(list)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportAll = () => downloadCsv(messages, 'messages-all.csv')
  const exportSelected = () => downloadCsv(messages.filter(m => selectedIds.has(m.id)), 'messages-selected.csv')
  const exportUnread = () => downloadCsv(messages.filter(m => !m.read), 'messages-unread.csv')
  const exportRead = () => downloadCsv(messages.filter(m => m.read), 'messages-read.csv')

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Mail className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">消息管理</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchMessages}
                className="text-gray-600 hover:text-blue-600 transition-colors"
                title="刷新"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <Link
                href="/admin"
                className="text-gray-600 hover:text-blue-600 transition-colors"
              >
                返回控制台
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">总消息数</p>
                <p className="text-2xl font-bold text-gray-900">{messages.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">今日消息</p>
                <p className="text-2xl font-bold text-gray-900">
                  {messages.filter(msg => 
                    new Date(msg.createdAt).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <User className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">独立用户</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(messages.map(msg => msg.email)).size}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 消息列表 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center flex-wrap gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">消息列表</h2>
                    <Link href="/admin/emails" className="text-blue-600 hover:text-blue-700 flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-1" />
                      邮箱管理
                    </Link>
                  </div>
                  <span className="text-sm text-gray-500">
                    共 {filteredMessages.length} 条消息
                  </span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div className="flex items-center flex-wrap gap-2">
                    <button
                      onClick={exportAll}
                      className="text-green-600 hover:text-green-700 flex items-center text-sm"
                      title="导出全部"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      导出全部
                    </button>
                    <button
                      onClick={exportSelected}
                      disabled={selectedCount === 0}
                      className={`flex items-center text-sm ${selectedCount === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:text-green-700'}`}
                      title="导出选中"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      导出选中
                    </button>
                    <button
                      onClick={exportUnread}
                      className="text-green-600 hover:text-green-700 flex items-center text-sm"
                      title="导出未处理"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      导出未处理
                    </button>
                    <button
                      onClick={exportRead}
                      className="text-green-600 hover:text-green-700 flex items-center text-sm"
                      title="导出已处理"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      导出已处理
                    </button>
                  </div>
                  <div className="flex items-center flex-wrap gap-3">
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        className="mr-2"
                      />
                      全选当前列表
                    </label>
                    <span className="text-sm text-gray-500">已选 {selectedCount} 条</span>
                  </div>
                </div>

                {/* 搜索框 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="搜索消息..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">加载中...</p>
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      {searchTerm ? '没有找到匹配的消息' : '暂无消息'}
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        selectedMessage?.id === message.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedMessage(message)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(message.id)}
                              onChange={(e) => {
                                e.stopPropagation()
                                toggleSelect(message.id)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4"
                            />
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {message.name}
                            </p>
                            {message.read ? (
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                已处理
                              </span>
                            ) : (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                未处理
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {message.email}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {message.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <label className="flex items-center text-xs text-gray-600">
                            <input
                              type="checkbox"
                              checked={message.read}
                              onChange={(e) => {
                                e.stopPropagation()
                                updateProcessed(message.id, e.target.checked)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="mr-1"
                            />
                            已处理
                          </label>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMessage(message)
                            }}
                            className="text-blue-600 hover:text-blue-700"
                            title="查看详情"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteMessage(message.id)
                            }}
                            className="text-red-600 hover:text-red-700"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">留言转发</h3>
              </div>
              {forwardLoading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">加载中...</p>
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      转发邮箱
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={forwardEmail}
                        onChange={(e) => setForwardEmail(e.target.value)}
                        className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="notify@example.com"
                      />
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      启用转发
                    </label>
                    <div className="flex items-center h-10">
                      <input
                        type="checkbox"
                        checked={forwardEnabled}
                        onChange={(e) => setForwardEnabled(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="ml-2 text-sm text-gray-600">有新留言时自动转发</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={saveForwardSettings}
                      disabled={forwardSaving}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {forwardSaving ? '保存中...' : '保存设置'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">消息详情</h3>
              </div>

              {selectedMessage ? (
                <div className="p-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        姓名
                      </label>
                      <p className="text-sm text-gray-900">{selectedMessage.name}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        邮箱
                      </label>
                      <p className="text-sm text-gray-900">{selectedMessage.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        国家
                      </label>
                      <p className="text-sm text-gray-900">{selectedMessage.country || '-'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        订单号
                      </label>
                      <p className="text-sm text-gray-900">{selectedMessage.orderNo || '-'}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        提交时间
                      </label>
                      <p className="text-sm text-gray-900">
                        {formatDate(selectedMessage.createdAt)}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        消息内容
                      </label>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-900 whitespace-pre-wrap">
                          {selectedMessage.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <label className="text-sm font-medium text-gray-700">
                        是否已处理
                      </label>
                      <input
                        type="checkbox"
                        checked={selectedMessage.read}
                        onChange={(e) => updateProcessed(selectedMessage.id, e.target.checked)}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <button
                        onClick={() => deleteMessage(selectedMessage.id)}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        删除消息
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">选择一条消息查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
