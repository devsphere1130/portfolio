import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Navbar } from '../components/Navbar';
import { ProjectCTA } from '../components/case-study/ProjectCTA';
import { ProjectGallery, ProjectLightbox } from '../components/case-study/ProjectGallery';
import { ProjectHero } from '../components/case-study/ProjectHero';
import { ProjectVideoSection } from '../components/case-study/ProjectVideoSection';
import {
  ProjectBuildComponents, ProjectFeatures, ProjectOutcomes, ProjectOverview, ProjectStory, ProjectTechnologyStack, RelatedProjects,
} from '../components/case-study/Sections';
import { useCaseStudy, useDocumentMeta } from '../components/case-study/useCaseStudy';
import { getLenis, useLenis } from '../hooks/useLenis';
import { numberSections } from '../lib/caseStudy';
import '../components/case-study/case-study.css';

/** Sections render only when they have published content; numbering follows what is shown. */
function visibleSections(p) {
  return [
    (p.overview.length > 0 || p.audience) && 'overview',
    p.build_components.length > 0 && 'build',
    p.gallery.length > 0 && 'gallery',
    p.videos.length > 0 && 'video',
    p.story.length > 0 && 'story',
    p.features.length > 0 && 'features',
    p.stack.length > 0 && 'stack',
    p.outcomes.length > 0 && 'outcomes',
    p.related.length > 0 && 'related',
  ].filter(Boolean);
}

const PageState = ({ title, highlight, children, actions }) => (
  <section className="cs-state">
    <div>
      <h1 className="cs-heading">{title} <span>{highlight}</span></h1>
      <p className="cs-lead">{children}</p>
      <div className="cs-state-actions">{actions}</div>
    </div>
  </section>
);

const Loading = () => (
  <section className="cs-hero" aria-busy="true" aria-label="Loading the case study">
    <div className="cs-shell cs-skeleton" aria-hidden="true">
      <i style={{ width: '6rem' }} />
      <i style={{ width: 'min(36rem, 90%)', height: '4.5rem' }} />
      <i style={{ width: 'min(28rem, 80%)' }} />
      <i style={{ width: 'min(32rem, 85%)' }} />
    </div>
  </section>
);

const CaseStudyContent = ({ project }) => {
  const [lightbox, setLightbox] = useState(null);
  const openGallery = useCallback((images, index) => setLightbox({ images, index }), []);
  const openImage = useCallback((image) => setLightbox({ images: [image], index: 0 }), []);
  const sections = visibleSections(project);
  const number = numberSections(sections);
  const has = (key) => sections.includes(key);

  useDocumentMeta({
    title: `${project.seo.title} | DevSphere`,
    description: project.seo.description,
    image: project.seo.image?.url,
    url: `${window.location.origin}/work/${project.slug}`,
  });

  const explore = () => {
    const target = document.querySelector('.cs-hero + .cs-section');
    if (!target) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { offset: -40 });
    else target.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <ProjectHero project={project} onExplore={explore} />
      {has('overview') && <ProjectOverview project={project} index={number.overview} />}
      {has('build') && <ProjectBuildComponents items={project.build_components} index={number.build} onOpenImage={openImage} />}
      {has('gallery') && <ProjectGallery images={project.gallery} index={number.gallery} onOpen={openGallery} />}
      {has('video') && <ProjectVideoSection videos={project.videos} index={number.video} />}
      {has('story') && <ProjectStory blocks={project.story} index={number.story} onOpenImage={openImage} />}
      {has('features') && <ProjectFeatures features={project.features} index={number.features} />}
      {has('stack') && <ProjectTechnologyStack stack={project.stack} index={number.stack} />}
      {has('outcomes') && <ProjectOutcomes outcomes={project.outcomes} index={number.outcomes} />}
      <ProjectCTA project={project} />
      {has('related') && <RelatedProjects projects={project.related} index={number.related} />}
      <AnimatePresence>
        {lightbox && <ProjectLightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />}
      </AnimatePresence>
    </>
  );
};

export const CaseStudy = () => {
  useLenis();
  const { slug } = useParams();
  const { status, project, retry } = useCaseStudy(slug);

  // Opening another project (e.g. from Related) starts at the top.
  useEffect(() => {
    getLenis()?.scrollTo(0, { immediate: true });
    window.scrollTo(0, 0);
  }, [slug]);

  return (
    <div className="cs-page min-h-screen overflow-hidden bg-[#05070a] text-white">
      <Navbar />
      <main>
        {status === 'loading' && <Loading />}
        {status === 'ready' && <CaseStudyContent key={project.slug} project={project} />}
        {status === 'not-found' && (
          <PageState title="This project isn’t" highlight="available."
                     actions={<><Link className="interactive hero-content-cta hero-content-cta-primary" to="/projects"><span>See all work</span></Link>
                       <Link className="cs-link" to="/"><ArrowLeft size={16} aria-hidden="true" />Back home</Link></>}>
            It may have been moved or unpublished. The rest of our work is one click away.
          </PageState>
        )}
        {status === 'error' && (
          <PageState title="We couldn’t load" highlight="this project."
                     actions={<><button type="button" className="interactive hero-content-cta hero-content-cta-primary" onClick={retry}><span><RotateCcw size={16} aria-hidden="true" />Try again</span></button>
                       <Link className="cs-link" to="/projects">See all work</Link></>}>
            Check your connection and try again.
          </PageState>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CaseStudy;
