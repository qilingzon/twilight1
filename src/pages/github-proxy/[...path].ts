/**
 * Astro API 路由 - GitHub API 代理
 * 路径: /github-proxy/*
 * 用于代理 api.github.com 请求，解决网络访问问题
 */

import type { APIRoute } from 'astro';

// 禁用静态预渲染，使用服务端渲染
export const prerender = false;

const GITHUB_API = 'https://api.github.com';

export const ALL: APIRoute = async ({ request, params }) => {
  // 处理 CORS 预检请求
  if (request.method === 'OPTIONS') {
    return handleCORS(request);
  }

  // 获取路径参数
  const path = params.path ? '/' + params.path : '';
  const url = new URL(request.url);

  // 构建 GitHub API URL
  const githubUrl = GITHUB_API + path + url.search;

  // 复制请求头
  const headers = new Headers();
  for (const [key, value] of request.headers) {
    const lowerKey = key.toLowerCase();
    if (
      !lowerKey.startsWith('cf-') &&
      lowerKey !== 'host' &&
      lowerKey !== 'x-forwarded-for' &&
      lowerKey !== 'x-real-ip' &&
      lowerKey !== 'connection'
    ) {
      headers.set(key, value);
    }
  }

  // GitHub API 要求 User-Agent
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'Decap-CMS-Proxy');
  }

  try {
    // 转发请求到 GitHub API
    const response = await fetch(githubUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== 'GET' && request.method !== 'HEAD'
        ? await request.text()
        : undefined,
    });

    // 添加 CORS 头
    const responseHeaders = new Headers(response.headers);
    const origin = request.headers.get('Origin');
    responseHeaders.set('Access-Control-Allow-Origin', origin || '*');
    responseHeaders.set('Access-Control-Allow-Credentials', 'true');
    // 移除可能导致问题的头
    responseHeaders.delete('content-encoding');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
};

function handleCORS(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// 导出所有 HTTP 方法
export const GET = ALL;
export const POST = ALL;
export const PUT = ALL;
export const DELETE = ALL;
export const PATCH = ALL;
