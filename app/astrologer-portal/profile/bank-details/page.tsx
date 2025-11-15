"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface BankDetail {
  id: string
  bank_name: string
  account_holder_name: string
  account_number: string
  ifsc_code: string
  account_type: string
  branch_name: string
  upi_id: string
  is_primary: boolean
  is_verified: boolean
  created_at: string
}

export default function BankDetailsPage() {
  const router = useRouter()
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "savings",
    branch_name: "",
    upi_id: "",
  })

  useEffect(() => {
    fetchBankDetails()
  }, [])

  const fetchBankDetails = async () => {
    try {
      const response = await fetch("/api/astrologer/profile/bank-details")
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/astrologer-portal/login")
          return
        }
        throw new Error("Failed to fetch bank details")
      }

      const data = await response.json()
      setBankDetails(data.bankDetails || [])
    } catch (error) {
      console.error("Failed to fetch bank details:", error)
      setError("Failed to load bank details")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSaving(true)

    try {
      const response = await fetch("/api/astrologer/profile/bank-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to add bank details")
        setSaving(false)
        return
      }

      setSuccess("Bank details added successfully!")
      setShowForm(false)
      setFormData({
        bank_name: "",
        account_holder_name: "",
        account_number: "",
        ifsc_code: "",
        account_type: "savings",
        branch_name: "",
        upi_id: "",
      })
      await fetchBankDetails()
    } catch (err) {
      setError("Failed to add bank details")
    } finally {
      setSaving(false)
    }
  }

  const deleteBankDetail = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bank account?")) return

    try {
      const response = await fetch(`/api/astrologer/profile/bank-details/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setSuccess("Bank account deleted successfully!")
        await fetchBankDetails()
      } else {
        setError("Failed to delete bank account")
      }
    } catch (err) {
      setError("Failed to delete bank account")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-[#ff6f1e] text-5xl mb-4"></i>
          <p className="text-gray-600">Loading bank details...</p>
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
          <h1 className="text-xl font-bold">Bank Details</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <i className={`fas ${showForm ? "fa-times" : "fa-plus"} text-xl`}></i>
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

        {/* Add Bank Account Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              <i className="fas fa-plus-circle text-[#ff6f1e] mr-2"></i>
              Add Bank Account
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.account_holder_name}
                    onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                    placeholder="As per bank records"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.bank_name}
                    onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                    placeholder="e.g., HDFC Bank"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.account_number}
                    onChange={(e) => setFormData({ ...formData, account_number: e.target.value.replace(/\D/g, "") })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                    placeholder="Enter account number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                    placeholder="e.g., HDFC0001234"
                    maxLength={11}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                  >
                    <option value="savings">Savings</option>
                    <option value="current">Current</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                  <input
                    type="text"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                    placeholder="e.g., Mumbai Main Branch"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.upi_id}
                    onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#ff6f1e]"
                    placeholder="e.g., yourname@paytm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-gradient-to-r from-[#ff6f1e] to-[#ff8c42] text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    Adding Account...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-plus"></i>
                    Add Bank Account
                  </span>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Bank Accounts List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            <i className="fas fa-university text-[#ff6f1e] mr-2"></i>
            Your Bank Accounts
          </h3>

          {bankDetails.length === 0 ? (
            <div className="text-center py-12">
              <i className="fas fa-university text-gray-300 text-6xl mb-4"></i>
              <p className="text-gray-600">No bank accounts added yet</p>
              <p className="text-sm text-gray-500">Add a bank account to receive withdrawals</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 px-6 py-2 bg-[#ff6f1e] text-white rounded-lg hover:bg-[#ff5f0e]"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Bank Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bankDetails.map((bank) => (
                <div
                  key={bank.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-[#ff6f1e] transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#ff6f1e] to-[#ff8c42] rounded-full flex items-center justify-center">
                        <i className="fas fa-university text-white text-xl"></i>
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900">{bank.bank_name}</h4>
                        <p className="text-sm text-gray-600">{bank.account_holder_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bank.is_primary && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                          Primary
                        </span>
                      )}
                      {bank.is_verified ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <i className="fas fa-check mr-1"></i>
                          Verified
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                          <i className="fas fa-clock mr-1"></i>
                          Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Account Number</p>
                      <p className="font-mono font-semibold text-gray-900">
                        ****{bank.account_number.slice(-4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">IFSC Code</p>
                      <p className="font-mono font-semibold text-gray-900">{bank.ifsc_code}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Account Type</p>
                      <p className="font-semibold text-gray-900 capitalize">{bank.account_type}</p>
                    </div>
                    {bank.upi_id && (
                      <div>
                        <p className="text-gray-600">UPI ID</p>
                        <p className="font-semibold text-gray-900">{bank.upi_id}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                    <button
                      onClick={() => deleteBankDetail(bank.id)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm"
                    >
                      <i className="fas fa-trash mr-2"></i>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-600 mt-1"></i>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Important Information</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Bank details are used for withdrawal processing</li>
                <li>Verification may take 24-48 hours</li>
                <li>Ensure account holder name matches your ID proof</li>
                <li>You can add multiple accounts but only one will be primary</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
