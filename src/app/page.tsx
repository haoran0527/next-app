import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              记账本应用
            </h1>
            <div className="flex space-x-4">
              <Link href="/login">
                <Button variant="outline">登录</Button>
              </Link>
              <Link href="/register">
                <Button>注册</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            欢迎使用记账本
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            简单、安全、高效的个人财务管理工具
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <Card>
            <CardHeader>
              <CardTitle>安全可靠</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                采用先进的加密技术保护您的财务数据，确保隐私安全
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>数据隔离</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                每个用户的数据完全隔离，只有您能访问自己的财务信息
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>简单易用</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                直观的界面设计，让记账变得简单快捷
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Link href="/register">
            <Button size="lg" className="mr-4">
              立即开始
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg">
              已有账户？登录
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
