import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// ─── Row → type helpers ───────────────────────────────────────────────────────

function rowToPortal(r: Record<string, unknown>) {
  return {
    clientId:       r.client_id as string,
    userId:         r.user_id as string,
    token:          r.token as string,
    isEnabled:      (r.is_enabled as boolean) ?? false,
    freelancerName: r.freelancer_name as string,
    headerNote:     r.header_note as string | undefined,
    allowFeedback:  (r.allow_feedback as boolean) ?? true,
    showInvoices:   (r.show_invoices as boolean) ?? true,
    showFiles:      (r.show_files as boolean) ?? true,
    showUpdates:    (r.show_updates as boolean) ?? true,
  };
}

function rowToClient(r: Record<string, unknown>) {
  return {
    id:       r.id as string,
    userId:   r.user_id as string,
    name:     r.name as string,
    company:  r.company as string | undefined,
    email:    r.email as string | undefined,
    phone:    r.phone as string | undefined,
    currency: (r.currency ?? "USD") as string,
    country:  r.country as string | undefined,
    notes:    r.notes as string | undefined,
    createdAt: r.created_at as string,
  };
}

function rowToUpdate(r: Record<string, unknown>) {
  return {
    id:        r.id as string,
    clientId:  r.client_id as string,
    userId:    r.user_id as string,
    title:     r.title as string,
    content:   r.content as string,
    status:    r.status as string,
    createdAt: r.created_at as string,
  };
}

function rowToFile(r: Record<string, unknown>) {
  return {
    id:          r.id as string,
    clientId:    r.client_id as string,
    userId:      r.user_id as string,
    name:        r.name as string,
    type:        r.type as string,
    sizeLabel:   r.size_label as string,
    description: r.description as string | undefined,
    uploadedAt:  r.uploaded_at as string,
    storagePath: r.storage_path as string | undefined,
    storageUrl:  r.storage_url as string | undefined,
  };
}

function rowToInvoice(r: Record<string, unknown>) {
  return {
    id:            r.id as string,
    userId:        r.user_id as string,
    clientName:    r.client_name as string,
    clientId:      r.client_id as string | undefined,
    invoiceNumber: r.invoice_number as string,
    status:        r.status as string,
    issueDate:     r.issue_date as string,
    dueDate:       r.due_date as string,
    currency:      (r.currency ?? "USD") as string,
    subtotal:      (r.subtotal ?? 0) as number,
    taxRate:       (r.tax_rate ?? 0) as number,
    taxAmount:     (r.tax_amount ?? 0) as number,
    total:         (r.total ?? 0) as number,
    notes:         r.notes as string | undefined,
    paidAt:        r.paid_at as string | undefined,
    items:         (r.items ?? []) as unknown[],
  };
}

function rowToProposal(r: Record<string, unknown>) {
  return {
    id:                    r.id as string,
    userId:                r.user_id as string,
    clientId:              r.client_id as string,
    clientName:            r.client_name as string,
    projectName:           r.project_name as string,
    status:                r.status as string,
    items:                 (r.items ?? []) as unknown[],
    currency:              (r.currency ?? "USD") as string,
    subtotal:              (r.subtotal ?? 0) as number,
    total:                 (r.total ?? 0) as number,
    validUntil:            r.valid_until as string | undefined,
    scope:                 r.scope as string | undefined,
    deliverables:          r.deliverables as string | undefined,
    notes:                 r.notes as string | undefined,
    createdAt:             r.created_at as string,
    sentAt:                r.sent_at as string | undefined,
    respondedAt:           r.responded_at as string | undefined,
    convertedToInvoiceId:  r.converted_to_invoice_id as string | undefined,
    convertedToContractId: r.converted_to_contract_id as string | undefined,
    convertedToProjectId:  r.converted_to_project_id as string | undefined,
  };
}

function rowToContract(r: Record<string, unknown>) {
  return {
    id:                       r.id as string,
    userId:                   r.user_id as string,
    clientId:                 r.client_id as string,
    clientName:               r.client_name as string,
    projectName:              r.project_name as string,
    status:                   r.status as string,
    proposalId:               r.proposal_id as string | undefined,
    rate:                     (r.rate ?? 0) as number,
    rateType:                 r.rate_type as string,
    currency:                 (r.currency ?? "USD") as string,
    paymentTermsDays:         (r.payment_terms_days ?? 30) as number,
    startDate:                r.start_date as string,
    endDate:                  r.end_date as string | undefined,
    scope:                    r.scope as string,
    deliverables:             r.deliverables as string,
    revisionPolicy:           r.revision_policy as string | undefined,
    terminationClause:        r.termination_clause as string | undefined,
    notes:                    r.notes as string | undefined,
    createdAt:                r.created_at as string,
    signedAt:                 r.signed_at as string | undefined,
    freelancerSignatureName:  r.freelancer_signature_name as string | undefined,
    clientSignatureName:      r.client_signature_name as string | undefined,
    clientSignedAt:           r.client_signed_at as string | undefined,
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = createServiceClient();

  // Fetch the portal (enabled check — disabled portals return 404 from this route too)
  const { data: portalRow } = await supabase
    .from("client_portals")
    .select("*")
    .eq("token", token)
    .single();

  if (!portalRow) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const p = rowToPortal(portalRow as Record<string, unknown>);
  const { clientId, userId } = p;

  // Fetch data sequentially to avoid auth lock contention
  const clientRow = await supabase
    .from("clients").select("*").eq("id", clientId).single()
    .then((r) => r.data);

  const profileRow = await supabase
    .from("profiles").select("email, phone, website, bio, is_pro, public_page_slug, payment_info").eq("id", userId).single()
    .then((r) => r.data);

  const paymentInfo = (profileRow?.payment_info ?? null) as {
    accountName?: string; bankName?: string; iban?: string; bic?: string;
    paypalEmail?: string; wiseEmail?: string; paymentNotes?: string;
  } | null;

  const freelancerInfo = {
    email: (profileRow?.email as string | undefined) ?? null,
    phone: (profileRow?.phone as string | undefined) ?? null,
    website: (profileRow?.website as string | undefined) ?? null,
    bio: (profileRow?.bio as string | undefined) ?? null,
    isPro: (profileRow?.is_pro as boolean | undefined) ?? false,
    portfolioUrl: (profileRow?.public_page_slug as string | undefined) ? `/${profileRow?.public_page_slug}` : null,
  };

  const updatesRows = p.showUpdates
    ? await supabase.from("portal_updates").select("*").eq("client_id", clientId)
        .order("created_at", { ascending: false }).then((r) => r.data ?? [])
    : [];

  const filesRows = p.showFiles
    ? await supabase.from("shared_files").select("*").eq("client_id", clientId)
        .order("uploaded_at", { ascending: false }).then((r) => r.data ?? [])
    : [];

  const invoicesRows = p.showInvoices
    ? await supabase.from("invoices").select("*").eq("user_id", userId)
        .order("issue_date", { ascending: false }).then((r) => r.data ?? [])
    : [];

  const proposalsRows = await supabase.from("proposals").select("*").eq("client_id", clientId)
    .neq("status", "draft").order("created_at", { ascending: false })
    .then((r) => r.data ?? []);

  const contractsRows = await supabase.from("contracts").select("*").eq("client_id", clientId)
    .neq("status", "draft").order("created_at", { ascending: false })
    .then((r) => r.data ?? []);

  const client = clientRow ? rowToClient(clientRow as Record<string, unknown>) : null;

  // Filter invoices to only this client — prefer FK match, fall back to name
  const clientName = client?.name ?? "";
  const invoices = (invoicesRows as Record<string, unknown>[])
    .filter((r) => r.client_id ? r.client_id === clientId : (r.client_name as string) === clientName)
    .map(rowToInvoice);

  return NextResponse.json({
    portal: p,
    client,
    freelancerInfo,
    paymentInfo,
    updates: (updatesRows as Record<string, unknown>[]).map(rowToUpdate),
    files:   (filesRows   as Record<string, unknown>[]).map(rowToFile),
    invoices,
    proposals: (proposalsRows as Record<string, unknown>[]).map(rowToProposal),
    contracts: (contractsRows as Record<string, unknown>[]).map(rowToContract),
  });
}
