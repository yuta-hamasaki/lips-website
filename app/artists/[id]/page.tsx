import { notFound } from 'next/navigation'
import SiteFooter from '@/components/SiteFooter'
import { getArtistById } from '@/lib/content/artists'

export const revalidate = 60

export default async function ArtistPage({ params }: { params: { id: string } }) {
  let artist
  try { artist = await getArtistById(params.id) }
  catch (error) {
    console.error('Unable to load artist', error instanceof Error ? error.message : 'Unknown error')
    notFound()
  }
  if (!artist) notFound()

  return <>
    <main className="artist-page">
      <a className="brand" href="/">Lips<span>.</span></a>
      <article className="artist-profile">
        <div className="artist-portrait"><img src={artist.image} alt={artist.name}/></div>
        <div className="artist-biography">
          <p className="micro">{artist.role ?? 'THE LINEUP'}</p>
          <h1>{artist.name}</h1>
          <div className="artist-description" dangerouslySetInnerHTML={{ __html: artist.description }}/>
          <a className="outline-button" href="/#lineup">← BACK TO LINEUP</a>
        </div>
      </article>
    </main>
    <SiteFooter/>
  </>
}
