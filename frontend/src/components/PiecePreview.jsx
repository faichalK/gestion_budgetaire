import { useEffect, useState } from 'react'
import { fetchPieceBlobUrl, downloadPiece } from '../api/depenses'

/**
 * Affiche une pièce justificative en fetchant le fichier via axios (JWT inclus).
 * Évite le 401 causé par <img src> / <iframe src> / <a href> directs.
 */
export default function PiecePreview({ piece, maxHeight = 460, style = {} }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  const [erreur,  setErreur]  = useState(false)

  useEffect(() => {
    if (!piece?.id) return
    let objectUrl
    setLoading(true); setBlobUrl(null); setErreur(false)
    fetchPieceBlobUrl(piece.id)
      .then(url => { objectUrl = url; setBlobUrl(url) })
      .catch(() => setErreur(true))
      .finally(() => setLoading(false))
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [piece?.id])

  const isImg = piece?.type_mime?.startsWith('image/')
           || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(piece?.nom_original || '')
  const isPdf = piece?.type_mime === 'application/pdf'
           || piece?.nom_original?.toLowerCase().endsWith('.pdf')

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, color: 'var(--af-mute)', fontSize: 13 }}>
      Chargement…
    </div>
  )

  if (erreur) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, gap: 10 }}>
      <div style={{ fontSize: 13, color: 'var(--af-mute)' }}>Impossible de charger le fichier.</div>
      <button className="btn btn-secondary btn-sm" onClick={() => downloadPiece(piece.id, piece.nom_original)}>
        Télécharger
      </button>
    </div>
  )

  if (!blobUrl) return null

  if (isImg) return (
    <div style={{ width: '100%', textAlign: 'center', ...style }}>
      <img
        src={blobUrl}
        alt={piece.nom_original}
        style={{ maxWidth: '100%', maxHeight, objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 20px rgba(14,42,71,0.15)' }}
      />
    </div>
  )

  if (isPdf) return (
    <div style={{ width: '100%', height: '100%', minHeight: maxHeight, ...style }}>
      <iframe
        src={blobUrl}
        title={piece.nom_original}
        style={{ width: '100%', height: maxHeight, border: 'none', borderRadius: 8 }}
      />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120, gap: 12, ...style }}>
      <div style={{ fontSize: 52 }}>📎</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--af-ink)' }}>{piece.nom_original || 'Fichier'}</div>
      <button
        className="btn btn-secondary btn-sm"
        style={{ gap: 6 }}
        onClick={() => downloadPiece(piece.id, piece.nom_original)}
      >
        Télécharger
      </button>
    </div>
  )
}
