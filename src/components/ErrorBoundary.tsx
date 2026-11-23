import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return <p className="p-8 text-sm">เกิดข้อผิดพลาดในการแสดงหน้า ลองรีเฟรชหน้าเว็บ</p>
    }
    return this.props.children
  }
}
