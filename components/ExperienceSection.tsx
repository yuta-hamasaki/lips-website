import { Play, Sparkles } from 'lucide-react'

export default function ExperienceSection() {
  return <section className="experience" id="experience">
    <div className="orb orb-one"/><div className="orb orb-two"/>
    <div className="experience-copy"><span>03 / THE EXPERIENCE</span><h2>SAME BEAT.<br/><em>DIFFERENT REALITY.</em></h2><p>Step through the portal. Lose yourself in sound, light and the people who make the night unforgettable.</p><button className="play"><i><Play fill="currentColor"/></i> WATCH THE FILM</button></div>
    <div className="experience-card"><Sparkles/><p>A NIGHT BEYOND<br/>THE ORDINARY.</p><span>VANCOUVER, BC<br/>SOMEWHERE AFTER DARK</span></div>
  </section>
}
