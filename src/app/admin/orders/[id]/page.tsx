'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
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
  provider: string
  eventType: string
  providerOrderId?: string | null
  providerCaptureId?: string | null
  amount?: number | null
  currency?: string | null
  rawPayload?: string
  createdAt: string
}

type OrderRecord = {
  id: string
  paypalOrderId?: string | null
  status: string
  shippingStatus: string
  refundStatus: string
  trackingNumber?: string | null
  currency: string
  totalAmount: number
  paidAt?: string | null
  shippedAt?: string | null
  refundedAt?: string | null
  createdAt: string
  items: OrderItem[]
  payments: PaymentTransaction[]
}

const SHIPPING_OPTIONS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED']
const REFUND_OPTIONS = ['NONE', 'REQUESTED', 'REFUNDED']
const LOG_FILTER_OPTIONS = [
  { value: 'ALL', label: '全部日志' },
  { value: 'PAYMENT', label: '支付相关' },
  { value: 'REFUND', label: '退款相关' },
  { value: 'OPS', label: '后台操作' },
]

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>()
  const id = String(params?.id || '')
  const [order, setOrder] = useState<OrderRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [shippingStatus, setShippingStatus] = useState('PENDING')
  const [refundStatus, setRefundStatus] = useState('NONE')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [logFilter, setLogFilter] = useState('ALL')

  const fetchOrder = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setErrorText('')
    try {
      const res = await fetch(`/api/orders/${id}`)
      if (!res.ok) {
        setErrorText('获取订单详情失败')
        return
      }
      const data = await res.json()
      setOrder(data)
      setShippingStatus(String(data?.shippingStatus || 'PENDING'))
      setRefundStatus(String(data?.refundStatus || 'NONE'))
      setTrackingNumber(String(data?.trackingNumber || ''))
    } catch (error) {
      console.error('获取订单详情失败:', error)
      setErrorText('获取订单详情失败')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const canSave = useMemo(() => {
    if (!order) return false
    if (shippingStatus !== (order.shippingStatus || 'PENDING')) return true
    if (refundStatus !== (order.refundStatus || 'NONE')) return true
    if (trackingNumber !== (order.trackingNumber || '')) return true
    return false
  }, [order, shippingStatus, refundStatus, trackingNumber])

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const filteredPayments = useMemo(() => {
    if (!order) return []
    if (logFilter === 'ALL') return order.payments
    if (logFilter === 'PAYMENT') {
      return order.payments.filter((p) => p.eventType.includes('PAYMENT') || p.eventType.includes('CHECKOUT'))
    }
    if (logFilter === 'REFUND') {
      return order.payments.filter((p) => p.eventType.includes('REFUND'))
    }
    return order.payments.filter((p) => p.provider === 'system' || p.eventType.includes('ORDER.'))
  }, [order, logFilter])

  const refundAmount = useMemo(() => {
    if (!order) return 0
    return order.payments
      .filter((payment) => payment.eventType.includes('REFUND') || payment.eventType.includes('REFUNDED'))
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
  }, [order])

  const timelineEntries = useMemo(() => {
    if (!order) return []
    const entries: Array<{ id: string; time: string; label: string; detail: string }> = []
    entries.push({
      id: `order-created-${order.id}`,
      time: order.createdAt,
      label: '订单创建',
      detail: `状态 ${order.status}`,
    })
    if (order.paidAt) {
      entries.push({
        id: `order-paid-${order.id}`,
        time: order.paidAt,
        label: '支付完成',
        detail: order.paypalOrderId || '-',
      })
    }
    if (order.shippedAt) {
      entries.push({
        id: `order-shipped-${order.id}`,
        time: order.shippedAt,
        label: '已发货',
        detail: order.trackingNumber || '无物流单号',
      })
    }
    if (order.refundedAt) {
      entries.push({
        id: `order-refunded-${order.id}`,
        time: order.refundedAt,
        label: '已退款',
        detail: refundAmount > 0 ? formatPrice(refundAmount) : '退款已确认',
      })
    }
    order.payments.forEach((payment) => {
      entries.push({
        id: payment.id,
        time: payment.createdAt,
        label: payment.eventType,
        detail: payment.providerCaptureId || payment.providerOrderId || payment.currency || '-',
      })
    })
    return entries.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  }, [order, refundAmount])

  const handleSave = async () => {
    if (!id || !canSave) return
    setSaving(true)
    setErrorText('')
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shippingStatus,
          refundStatus,
          trackingNumber,
        }),
      })
      if (!res.ok) {
        setErrorText('保存失败')
        return
      }
      const updated = await res.json()
      setOrder(updated)
      setShippingStatus(String(updated?.shippingStatus || 'PENDING'))
      setRefundStatus(String(updated?.refundStatus || 'NONE'))
      setTrackingNumber(String(updated?.trackingNumber || ''))
    } catch (error) {
      console.error('保存订单状态失败:', error)
      setErrorText('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/orders" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <span className="text-xl font-semibold text-gray-900">订单详情</span>
            </div>
            <button
              type="button"
              onClick={fetchOrder}
              className="text-gray-600 hover:text-blue-600 transition-colors"
              title="刷新"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-600">加载中...</div>
        ) : errorText ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{errorText}</div>
        ) : !order ? (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center text-gray-500">订单不存在</div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-500">本地订单号</div>
                  <div className="font-semibold text-gray-900 break-all">{order.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">PayPal 订单号</div>
                  <div className="font-medium text-gray-900 break-all">{order.paypalOrderId || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">订单金额</div>
                  <div className="font-semibold text-gray-900">{formatPrice(order.totalAmount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">退款金额</div>
                  <div className="font-semibold text-rose-600">{formatPrice(refundAmount)}</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">发货与退款状态</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">发货状态</label>
                  <select
                    value={shippingStatus}
                    onChange={(e) => setShippingStatus(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {SHIPPING_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">退款状态</label>
                  <select
                    value={refundStatus}
                    onChange={(e) => setRefundStatus(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {REFUND_OPTIONS.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">物流单号</label>
                  <input
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="可选"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  disabled={!canSave || saving}
                  onClick={handleSave}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : '保存状态'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">商品明细</h2>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm text-gray-700">
                    <span>{item.productTitle} × {item.quantity}</span>
                    <span>{formatPrice(item.lineTotal)}</span>
                  </div>
                ))}
                {order.items.length === 0 && <div className="text-sm text-gray-500">无商品明细</div>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">退款时间线</h2>
              <div className="space-y-3">
                {timelineEntries.map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-gray-900">{entry.label}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(entry.time)}</div>
                    </div>
                    <div className="text-xs text-gray-600 break-all mt-1">{entry.detail}</div>
                  </div>
                ))}
                {timelineEntries.length === 0 && <div className="text-sm text-gray-500">暂无时间线数据</div>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">支付流水</h2>
              <div className="mb-4">
                <select
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2 text-sm"
                >
                  {LOG_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                {filteredPayments.map((payment) => (
                  <div key={payment.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-gray-900">{payment.eventType}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(payment.createdAt)}</div>
                    </div>
                    <div className="text-xs text-gray-500 break-all">{payment.providerCaptureId || payment.providerOrderId || '-'}</div>
                    {typeof payment.amount === 'number' && (
                      <div className="text-xs text-gray-600 mt-1">金额：{formatPrice(payment.amount)}</div>
                    )}
                  </div>
                ))}
                {filteredPayments.length === 0 && <div className="text-sm text-gray-500">当前筛选下暂无日志</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
