import type { EventHandler, RouterMethod } from 'h3';

export type Route = {
  path: string;
  method: RouterMethod;
  handler: EventHandler;
};
