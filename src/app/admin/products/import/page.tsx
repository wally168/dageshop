'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Upload, 
  FileText,
  AlertCircle,
  CheckCircle,
  XCircle,
  Package
} from 'lucide-react'

interface Category {
  id: string
  name: string
  slug: string
}

interface Brand {
  id: string
  name: string
  slug: string
}

export default function ImportProducts() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [brandId, setBrandId] = useState('')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [catRes, brandRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/brands')
      ])
      
      if (catRes.ok) {
        const data = await catRes.json()
        setCategories(data)
        if (data.length > 0) {
          setCategoryId(data[0].id)
        }
      }

      if (brandRes.ok) {
        const data = await brandRes.json()
        setBrands(data)
        // 品牌是可选的，不默认选中第一个，或者默认选中 "无"
        // 如果需要默认选中第一个：
        // if (data.length > 0) setBrandId(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !categoryId) return

    setImporting(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('categoryId', categoryId)
    if (brandId) {
      formData.append('brandId', brandId)
    }

    try {
      const response = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
        if (data.success > 0 && data.failed === 0) {
          // Optional: clear file after success
          // setFile(null)
        }
      } else {
        setResult({
          success: 0,
          failed: 0,
          errors: [data.error || 'Import failed']
        })
      }
    } catch (error) {
      console.error('Import failed:', error)
      setResult({
        success: 0,
        failed: 0,
        errors: ['Network error or server error']
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/admin/products" className="text-gray-600 hover:text-blue-600 mr-4">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Package className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-semibold text-gray-900">批量导入产品</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">上传 Excel 表格</h1>
            <p className="text-gray-600 mt-2">
              请上传包含产品信息的 Excel 文件 (.xlsx)。
              必需字段: images, title, price, release_date, bullet_point_1-5, description, url
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择分类 <span className="text-red-500">*</span>
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading || categories.length === 0}
                  required
                >
                  {categories.length === 0 && <option>加载分类中...</option>}
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择品牌 (可选)
                </label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">-- 不选择品牌 --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Excel 文件 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors">
                <div className="space-y-1 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>上传文件</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        className="sr-only"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        required
                      />
                    </label>
                    <p className="pl-1">或拖拽文件到这里</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    支持 .xlsx, .xls 格式
                  </p>
                  {file && (
                    <p className="text-sm font-semibold text-blue-600 mt-2">
                      已选择: {file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!file || !categoryId || importing}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    正在导入...
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 mr-2" />
                    开始导入
                  </>
                )}
              </button>
            </div>
          </form>

          {result && (
            <div className={`mt-8 p-4 rounded-lg ${result.failed > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <div className="flex items-center mb-4">
                {result.failed > 0 ? (
                  <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                )}
                <h3 className={`text-lg font-medium ${result.failed > 0 ? 'text-red-900' : 'text-green-900'}`}>
                  导入完成
                </h3>
              </div>
              <div className="space-y-2">
                <p className="text-green-700">成功导入: {result.success} 个产品</p>
                {result.failed > 0 && (
                  <div>
                    <p className="text-red-700 font-medium">失败: {result.failed} 个产品</p>
                    <ul className="mt-2 list-disc list-inside text-sm text-red-600 space-y-1 max-h-60 overflow-y-auto">
                      {result.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="mt-4">
                <Link
                  href="/admin/products"
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  返回产品列表 &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
