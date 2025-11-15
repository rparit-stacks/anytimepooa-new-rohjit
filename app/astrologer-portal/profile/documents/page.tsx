"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Document {
  id: string
  document_type: string
  document_name: string
  document_url: string
  document_number: string
  verification_status: string
  rejection_reason: string
  created_at: string
}

const DOCUMENT_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card", icon: "fa-id-card" },
  { value: "pan", label: "PAN Card", icon: "fa-credit-card" },
  { value: "certificate", label: "Certificate", icon: "fa-certificate" },
  { value: "degree", label: "Degree", icon: "fa-graduation-cap" },
  { value: "photo_id", label: "Photo ID", icon: "fa-id-badge" },
  { value: "other", label: "Other", icon: "fa-file" },
]

export default function DocumentsPage() {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showUpload, setShowUpload] = useState(false)

  const [uploadData, setUploadData] = useState({
    document_type: "aadhaar",
    document_name: "",
    document_number: "",
    file: null as File | null,
  })

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const response = await fetch("/api/astrologer/profile/documents")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/astrologer-portal/login")
          return
        }
        throw new Error("Failed to fetch documents")
      }

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      setError("Failed to load documents")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("File size should be less than 10MB")
      return
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and PDF files are allowed")
      return
    }

    setUploadData({ ...uploadData, file })
    setError("")
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!uploadData.file) {
      setError("Please select a file")
      return
    }

    setError("")
    setSuccess("")
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("file", uploadData.file)
      formData.append("document_type", uploadData.document_type)
      formData.append("document_name", uploadData.document_name)
      formData.append("document_number", uploadData.document_number)

      const response = await fetch("/api/astrologer/profile/documents", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to upload document")
        setUploading(false)
        return
      }

      setSuccess("Document uploaded successfully! Verification pending.")
      setShowUpload(false)
      setUploadData({
        document_type: "aadhaar",
        document_name: "",
        document_number: "",
        file: null,
      })
      await fetchDocuments()
    } catch (err) {
      setError("Failed to upload document")
    } finally {
      setUploading(false)
    }
  }

  const deleteDocument = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return

    try {
      const response = await fetch(`/api/astrologer/profile/documents/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSuccess("Document deleted successfully!")
        await fetchDocuments()
      } else {
        setError("Failed to delete document")
      }
    } catch (err) {
      setError("Failed to delete document")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            <i className="fas fa-check-circle mr-1"></i>
            Verified
          </span>
        )
      case "rejected":
        return (
          <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
            <i className="fas fa-times-circle mr-1"></i>
            Rejected
          </span>
        )
      default:
        return (
          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
            <i className="fas fa-clock mr-1"></i>
            Pending
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-24">
      <header className="bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/astrologer-portal/profile" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <i className="fas fa-arrow-left text-xl"></i>
          </Link>
          <h1 className="text-xl font-bold">Documents</h1>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <i className={`fas ${showUpload ? "fa-times" : "fa-plus"} text-xl`}></i>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Upload Form */}
        {showUpload && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              <i className="fas fa-upload text-[#ff6f1e] mr-2"></i>
              Upload Document
            </h3>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type *</label>
                <select
                  value={uploadData.document_type}
                  onChange={(e) => setUploadData({ ...uploadData, document_type: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Name *</label>
                <input
                  type="text"
                  required
                  value={uploadData.document_name}
                  onChange={(e) => setUploadData({ ...uploadData, document_name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  placeholder="e.g., Aadhaar Card - Front"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Number (if applicable)
                </label>
                <input
                  type="text"
                  value={uploadData.document_number}
                  onChange={(e) => setUploadData({ ...uploadData, document_number: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  placeholder="e.g., XXXX XXXX 1234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select File *</label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Accepted: JPG, PNG, PDF (Max 10MB)
                </p>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-3 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {uploading ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-upload"></i>
                    Upload Document
                  </span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Documents List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-file-alt text-[#ff6f1e] mr-2"></i>
            Uploaded Documents
          </h3>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-file-upload text-gray-300 text-6xl mb-4"></i>
              <p className="text-gray-600">No documents uploaded yet</p>
              <p className="text-sm text-gray-500">Upload your verification documents</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 px-6 py-2 bg-[#ff6f1e] text-white rounded-lg hover:bg-[#ff5f0e]"
              >
                <i className="fas fa-upload mr-2"></i>
                Upload Document
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => {
                const docType = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)
                return (
                  <div
                    key={doc.id}
                    className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#ff6f1e] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full flex items-center justify-center">
                          <i className={`fas ${docType?.icon || "fa-file"} text-white text-xl`}></i>
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900">{doc.document_name}</h4>
                          <p className="text-sm text-gray-600">{docType?.label}</p>
                        </div>
                      </div>
                      {getStatusBadge(doc.verification_status)}
                    </div>

                    {doc.document_number && (
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Number:</span> {doc.document_number}
                      </p>
                    )}

                    {doc.verification_status === "rejected" && doc.rejection_reason && (
                      <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-700">
                          <span className="font-semibold">Rejection Reason:</span> {doc.rejection_reason}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        <a
                          href={doc.document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          <i className="fas fa-eye mr-1"></i>
                          View
                        </a>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          <i className="fas fa-trash mr-1"></i>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-600 mt-1"></i>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Verification Guidelines</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Upload clear, readable copies of your documents</li>
                <li>All details should be visible (no blur or cut-off)</li>
                <li>Verification typically takes 24-48 hours</li>
                <li>Rejected documents can be re-uploaded after correction</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
