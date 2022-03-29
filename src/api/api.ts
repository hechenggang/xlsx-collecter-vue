
const backendBaseUri = "https://xlsx-collecter-api.imhcg.cn"

// 把一个值转为字符串，显得没有那么多类型错误
function toString<T>(raw: T): string {
    return String(raw)
  }

export {backendBaseUri,toString}
