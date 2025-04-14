import { Card, Cards } from '../card';
import { JSIcon, NextIcon, ReactIcon } from '../icons';

const frameworkCards = [
  {
    href: '/docs/nextjs/quickstart',
    title: 'Next.js',
    icon: <NextIcon />,
    description:
      'Easily add secure, beautiful, and fast Consent Manager to Next.js with C15T.',
  },
  {
    href: '/docs/react/client-config-options',
    title: 'React',
    icon: <ReactIcon className="text-[#53C1DE]" />,
    description:
      'Get started installing and initializing C15T in a new React + Vite app.',
  },
  {
    href: '/docs/javascript',
    title: 'Javascript',
    icon: <JSIcon />,
    description:
      'The C15T JavaScript SDK gives you access to core functionality for managing consent.',
  },
];

export const IndexBlock = () => {
  return (
    <>
      <div className="flex flex-col space-y-10 pt-0">
        <div className="flex flex-col">
          <h4
            id="explore-by-category"
            className="scroll-m-20 text-muted-foreground text-sm uppercase"
          >
            Explore by Framework
          </h4>
          <hr className="mt-0 mb-6 border-border/50 border-t" />

          <Cards>
            {frameworkCards.map((card, index) => (
              <Card
                key={index}
                href={card.href}
                title={card.title}
                icon={card.icon}
              >
                {card.description}
              </Card>
            ))}
          </Cards>
        </div>
      </div>
    </>
  );
};
