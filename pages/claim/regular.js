// pages/claim/regular.js
import { useState } from "react";
import { jsPDF } from "jspdf";

export default function RegularClaimPage() {
  const [email, setEmail] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function downloadTicketPdf(code) {
    const doc = new jsPDF();
  
    doc.setFontSize(22);
    doc.text("Event Ticket", 20, 30);
  
    doc.setFontSize(14);
    doc.text("Ticket Type: Regular", 20, 50);
    doc.text(`Ticket Code: ${code}`, 20, 60);
  
    doc.setFontSize(10);
    doc.text("Please present this ticket at the door.", 20, 120);
  
    doc.save(`ticket-${code}.pdf`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setCodes([]);
    setLoading(true);

    try {
      const res = await fetch("/api/claim-ticket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          cargoOrderNumber: orderNumber || null,
          quantity,
          ticketType: "regular",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setCodes(data.codes || []);
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Claim Regular Ticket(s)
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">
              Email used at checkout
            </label>
            <input
              type="email"
              className="w-full border rounded px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              Cargo order number (optional)
            </label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. #5678"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              Number of tickets purchased
            </label>
            <input
              type="number"
              min={1}
              max={20}
              className="w-full border rounded px-3 py-2 text-sm"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2 text-sm font-medium"
          >
            {loading ? "Generating..." : "Get ticket code(s)"}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
        )}

        {codes.length > 0 && (
          <div className="mt-4 p-3 border rounded bg-green-50 text-sm">
            <p className="font-medium mb-1">
              Your Regular ticket code(s):
            </p>
            <ul className="space-y-1">
              {codes.map((c) => (
                <li key={c} className="font-mono text-base">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
