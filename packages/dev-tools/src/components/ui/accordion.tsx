'use client';

import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import {
	type ComponentPropsWithoutRef,
	type ComponentRef,
	forwardRef,
} from 'react';
import { cn } from '~/libs/utils';
import styles from './accordion.module.css';

const Accordion = AccordionPrimitive.Root;

const AccordionItem = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Item>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
	<AccordionPrimitive.Item
		ref={ref}
		className={cn(styles.item, className)}
		{...props}
	/>
));
AccordionItem.displayName = 'AccordionItem';

const AccordionTrigger = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Trigger>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Header className="flex">
		<AccordionPrimitive.Trigger
			ref={ref}
			className={cn(styles.trigger, className)}
			{...props}
		>
			{children}
			<ChevronDown className={cn(styles.chevron, 'h-4 w-4')} />
		</AccordionPrimitive.Trigger>
	</AccordionPrimitive.Header>
));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;

const AccordionContent = forwardRef<
	ComponentRef<typeof AccordionPrimitive.Content>,
	ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<AccordionPrimitive.Content
		ref={ref}
		className={cn(styles.content, className)}
		{...props}
	>
		<div className={styles.contentInner}>{children}</div>
	</AccordionPrimitive.Content>
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
