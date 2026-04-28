export const formatCurrency = (v: number | null | undefined) => {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v);
};

export const formatDate = (s: string | null | undefined) => {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
};

export const categoryLabels: Record<string, string> = {
  office_expense: "Despesa de escritório",
  travel: "Viagem",
  supplier_invoice: "Fatura de fornecedor",
  purchase_order: "Pedido de compra",
  receipt: "Recibo",
  payroll: "Folha de pagamento",
  utility: "Utilidades",
  marketing: "Marketing",
  software: "Software",
  food: "Alimentação",
  logistics: "Logística",
  other: "Outros",
};