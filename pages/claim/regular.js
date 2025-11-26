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

  // Generate a PDF ticket for a single code
  async function createTicketPdf({ code, email }) {
    // 1) Create the PDF (landscape)
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: [600, 300], // width, height
    });

    // 2) Load the background image from /public/tickets/ticket-bg.png
    const imgUrl = "/tickets/ticket-bg.png";

    const imgData = await fetch(imgUrl)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result); // base64 string
            reader.readAsDataURL(blob);
          })
      );

    // 3) Draw background
    doc.addImage(imgData, "PNG", 0, 0, 600, 300);

    //    with the exact second argument from jsPDFAPI.addFont(...)

    // Set text color #d88142 -> RGB(216, 129, 66)
    doc.setTextColor(216, 129, 66);

    // Font size
    doc.setFontSize(14);

    // Bottom-right anchor
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const bottomMargin = 10;
    const rightMargin = 30;

    const codeLine = `Code: ${code}`;
    const emailLine = `Email: ${email}`;

    const yEmail = pageHeight - bottomMargin; // bottom line
    const yCode = yEmail - 18;                // line above
    const x = pageWidth - rightMargin;

    // Right-aligned text
    doc.text(codeLine, x, yCode, { align: "right" });
    doc.text(emailLine, x, yEmail, { align: "right" });

    // 5) Save the PDF
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
      console.log("claim-ticket response (regular):", data);

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setCodes(Array.isArray(data.codes) ? data.codes : []);
    } catch (err) {
      console.error(err);
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
              placeholder="e.g. #1234"
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
              onChange={(e) =>
                setQuantity(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white rounded py-2 text-sm font-medium disabled:opacity-50"
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
            <ul className="space-y-2">
              {codes.map((c) => (
                <li
                  key={c}
                  className="flex items-center justify-between gap-2 font-mono text-base"
                >
                  <span>{c}</span>
                  <button
                    type="button"
                    onClick={() => createTicketPdf({ code: c, email })}
                    className="text-xs font-sans px-2 py-1 border rounded bg-white hover:bg-slate-100"
                  >
                    Download PDF
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
