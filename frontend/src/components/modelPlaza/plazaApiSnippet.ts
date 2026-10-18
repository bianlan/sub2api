/** 详情抽屉 API 页的调用示例。四种语言都使用 $YOUR_API_KEY。 */

export type PlazaApiLang = 'curl' | 'python' | 'typescript' | 'javascript'

const API_KEY = '$YOUR_API_KEY'
const PROMPT = 'Explain quantum entanglement in one paragraph.'
const FILE_ORIGIN = 'https://api.example.com'

/** 运行中的站点域名。本地 file:// 打开时回退到示例域名。 */
export function plazaApiOrigin(): string {
  if (typeof window === 'undefined' || window.location.protocol === 'file:') return FILE_ORIGIN
  return window.location.origin
}

export function buildPlazaApiSnippet(modelName: string, origin: string, lang: PlazaApiLang): string {
  const endpoint = `${origin}/v1/chat/completions`
  const model = JSON.stringify(modelName)
  if (lang === 'curl') {
    return [
      `curl ${endpoint} \\`,
      `  -H "Authorization: Bearer ${API_KEY}" \\`,
      `  -H "Content-Type: application/json" \\`,
      `  -d '{`,
      `    "model": ${model},`,
      `    "messages": [`,
      `      {`,
      `        "role": "user",`,
      `        "content": "${PROMPT}"`,
      `      }`,
      `    ],`,
      `    "temperature": 0.7`,
      `  }'`
    ].join('\n')
  }
  if (lang === 'python') {
    return [
      'import requests',
      '',
      'response = requests.post(',
      `    "${endpoint}",`,
      '    headers={',
      `        "Authorization": "Bearer ${API_KEY}",`,
      '        "Content-Type": "application/json",',
      '    },',
      '    json={',
      `        "model": ${model},`,
      '        "messages": [',
      `            {"role": "user", "content": "${PROMPT}"}`,
      '        ],',
      '        "temperature": 0.7,',
      '    },',
      ')',
      'print(response.json())'
    ].join('\n')
  }
  if (lang === 'typescript') {
    return [
      `const response = await fetch("${endpoint}", {`,
      '  method: "POST",',
      '  headers: {',
      `    "Authorization": "Bearer ${API_KEY}",`,
      '    "Content-Type": "application/json",',
      '  },',
      '  body: JSON.stringify({',
      `    model: ${model},`,
      '    messages: [',
      `      { role: "user", content: "${PROMPT}" }`,
      '    ],',
      '    temperature: 0.7,',
      '  }),',
      '})',
      '',
      'const data = await response.json()',
      'console.log(data)'
    ].join('\n')
  }
  return [
    `fetch("${endpoint}", {`,
    '  method: "POST",',
    '  headers: {',
    `    "Authorization": "Bearer ${API_KEY}",`,
    '    "Content-Type": "application/json",',
    '  },',
    '  body: JSON.stringify({',
    `    model: ${model},`,
    '    messages: [',
    `      { role: "user", content: "${PROMPT}" }`,
    '    ],',
    '    temperature: 0.7,',
    '  }),',
    '})',
    '  .then((res) => res.json())',
    '  .then((data) => console.log(data))'
  ].join('\n')
}
