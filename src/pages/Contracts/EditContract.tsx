const handleFileSelection = async (selectedFile: File | null) => {
  if (!user || !selectedFile) return
  setFile(selectedFile)
  setIsParsing(true)
  setStatusMessage('Uploading contract…')
  setStoragePath(null)

  try {
    const safeName = sanitizeFileName(selectedFile.name || 'contract.pdf')
    const objectPath = `${user.id}/ingest/${Date.now()}-${safeName}`

    // ✅ Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('contracts')
      .upload(objectPath, selectedFile, {
        upsert: true,
        cacheControl: '3600',
        contentType: selectedFile.type || 'application/pdf'
      })

    if (uploadError) throw uploadError
    setStoragePath(objectPath)

    setStatusMessage('Parsing contract with AI…')

    // ✅ FIXED: Edge Function now receives a temporary contractId
    const tempContractId = `temp-${Date.now()}`

    const { data, error } = await supabase.functions.invoke('contractParsing', {
      body: {
        contractId: tempContractId,
        storagePath: objectPath,
        userId: user.id
      }
    })

    if (error) throw error

    const parsed = data?.parsedContract ?? data ?? {}

    // Map parsed contract into your form state
    setFormData({
      title: parsed.title ?? selectedFile.name,
      property_address: parsed.property_address ?? parsed.address ?? '',
      client_name: parsed.client_name ?? parsed.buyer_name ?? '',
      buyer_name: parsed.buyer_name ?? '',
      buyer_email: parsed.buyer_email ?? '',
      seller_name: parsed.seller_name ?? '',
      seller_email: parsed.seller_email ?? '',
      purchase_price: parsed.purchase_price ? String(parsed.purchase_price) : '',
      closing_date: parsed.closing_date ?? '',
      inspection_date: parsed.inspection_date ?? '',
      inspection_response_date: parsed.inspection_response_date ?? '',
      loan_contingency_date: parsed.loan_contingency_date ?? '',
      appraisal_date: parsed.appraisal_date ?? '',
      final_walkthrough_date: parsed.final_walkthrough_date ?? '',
      summary: parsed.executive_summary ?? parsed.summary ?? ''
    })

    setRiskItems(parsed.risk_items ?? parsed.risks ?? [])
    setReviewOpen(true)
    setStatusMessage('Parsed successfully. Review the details.')
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to parse contract'
    toast({ title: 'Parsing failed', description: message, variant: 'destructive' })
    setFile(null)
    setStoragePath(null)
    setStatusMessage('')
  } finally {
    setIsParsing(false)
  }
}
