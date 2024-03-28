import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

// 定义接口返回的数据类型
export interface ApiResponse {
  errno: number
  data: {
    list: []
  }
}

// 创建实例
const http: AxiosInstance = axios.create({
  timeout: 6000, // 请求超时
  headers: {
    'Content-Type': 'application/json',
    'Accept-Control-Allow-Origin': '*'
  }
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response: AxiosResponse) => {
    const res = response.data
    if (res.errno !== 0) {
      ElMessage.error('网络错误')
      return Promise.reject(res)
    }
    return res
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 导出封装的get方法
export const get = (url: string, params?: object): Promise<ApiResponse> => {
  return http.get(url, { params })
}
