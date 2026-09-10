import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { Artist } from '@/lib/content/types'

export default function LineupSection({ artists }: { artists: Artist[] }) {
  return <section className="lineup" id="lineup">
    <div className="section-head"><div><span>02 /</span><h2>THE LINEUP</h2></div><p>From slow-burn R&amp;B to future-facing hip-hop.<br/>Artists from near and far. One electric night.</p></div>
    <div className="artist-grid">{artists.map((artist, i) => <Link className="artist" href={`/artists/${artist.id}`} key={artist.id}>
      <img src={artist.image} alt={artist.name}/><div className="artist-shade"/><span className="artist-no">0{i + 1}</span>
      <div className="artist-info"><small>{artist.role ?? 'ARTIST'}</small><h3>{artist.name}</h3></div><span className="artist-more" aria-label={`More about ${artist.name}`}><Plus/></span>
    </Link>)}</div>
  </section>
}
