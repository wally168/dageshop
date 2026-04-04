'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Receipt, CreditCard } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

type OrderItem = {
  id: string
  productId: string
  productTitle: string
  unitPrice: number
  quantity: number
  lineTotal: number
}

type PaymentTransaction = {
  id: string
  eventType: string
  providerOrderId?: string | null
  providerCaptureId?: string | null
  amount?: number | null
  currency?: string | null
  createdAt: string
}

type OrderRecord = {
  id: string
  paypalOrderId?: string | null
  status: string
  currency: string
  totalAmount: number
  paidAt?: string | null
  createdAt: string
  items: OrderItem[]
  payments: PaymentTransaction[]
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [errorText, setErrorText] = useState('')
  const [searchText, setSearchText] = useState('')

  const fetchOrders = async () => {
    setLoading(true)
    setErrorText('')
    try {
      const res = await fetch('/api/orders')
      if (!res.ok) {
        setErrorText('获取订单失败')
        return
      }
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('获取订单失败:', error)
      setErrorText('获取订单失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((order) => {
      if (order.id.toLowerCase().includes(q)) return true
      if ((order.paypalOrderId || '').toLowerCase().includes(q)) return true
      if (order.status.toLowerCase().includes(q)) return true
      return order.items.some((item) => item.productTitle.toLowerCase().includes(q))
    })
  }, [orders, searchText])

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Receipt className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">订单管理</span>
            </div>
            <button
              type="button"
              onClick={fetchOrders}
              className="text-gray-600 hover:text-blue-600 transition-colors"
              title="刷新"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">PayPal 订单</h1>
          <p className="text-gray-600 mt-2">查看支付状态、订单金额与最近支付流水</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border mb-6 p-4">
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="按订单号、PayPal 订单号、状态或商品名搜索"
            className="w-full md:w-96 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-600">加载中...</div>
        ) : errorText ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{errorText}</div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-sm text-gray-500">本地订单号</div>
                    <div className="font-semibold text-gray-900 break-all">{order.id}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">PayPal 订单号</div>
                    <div className="font-medium text-gray-900 break-all">{order.paypalOrderId || '-'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">状态</div>
                    <div className="font-semibold text-blue-700">{order.status}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">金额</div>
                    <div className="font-semibold text-gray-900">{formatPrice(order.totalAmount)}</div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">商品明细</div>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-sm text-gray-700 flex items-center justify-between gap-2">
                          <span className="truncate">{item.productTitle} × {item.quantity}</span>
                          <span>{formatPrice(item.lineTotal)}</span>
                        </div>
                      ))}
                      {order.items.length === 0 && <div className="text-sm text-gray-500">无商品明细</div>}
                    </div>
                  </div>
                  <div className="border rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      最近支付流水
                    </div>
                    <div className="space-y-2">
                      {order.payments.map((payment) => (
                        <div key={payment.id} className="text-sm text-gray-700">
                          <div className="font-medium">{payment.eventType}</div>
                          <div className="text-gray-500 break-all">{payment.providerCaptureId || payment.providerOrderId || '-'}</div>
                        </div>
                      ))}
                      {order.payments.length === 0 && <div className="text-sm text-gray-500">暂无流水</div>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">暂无订单</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
