// cSpell:disable
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import type {
	ActionDefinition,
	DestinationDefinition,
	InputField,
} from '@segment/actions-core';

import Chance from 'chance';

type Choices = Pick<InputField, 'choices'>;

function setTestData(
	seedName: string,
	type: string,
	fieldName?: string,
	format?: string,
	choices?: Choices
) {
	const chance = new Chance(seedName);

	if (Array.isArray(choices)) {
		const choice = chance.pickone(choices);

		if (choice.value) {
			return choice.value;
		}
		return choice;
	}
	let val: any;
	switch (type) {
		case 'boolean':
			val = chance.bool();
			break;
		case 'datetime':
			val = '2021-02-01T00:00:00.000Z';
			break;
		case 'integer':
			val = chance.integer();
			break;
		case 'number':
			val = chance.floating({ fixed: 2 });
			break;
		case 'object':
			val = { testType: chance.string() };
			break;
		case 'text':
			val = chance.sentence();
			break;
		default:
			// covers string
			switch (format) {
				case 'date': {
					val = '2021-02-01T00:00:00.000Z';
					break;
				}
				case 'date-time':
					val = '2021-02-01T00:00:00.000Z';
					break;
				case 'email':
					val = chance.email();
					break;
				case 'hostname':
					val = chance.domain();
					break;
				case 'ipv4':
					val = chance.ip();
					break;
				case 'ipv6':
					val = chance.ipv6();
					break;
				case 'time': {
					const d = chance.date();
					val = [d.getHours(), d.getMinutes(), d.getSeconds()]
						.map((v) => String(v).padStart(2, '0'))
						.join(':');
					break;
				}
				case 'uri':
					val = chance.url();
					break;
				case 'uuid':
					val = chance.guid();
					break;
				default:
					val = chance.string();
					break;
			}
			break;
	}

	if (fieldName === 'email') {
		val = chance.email();
	}
	if (fieldName === 'currency') {
		val = chance.currency().code;
	}

	return val;
}

function setData(
	eventData: any,
	chanceName: string,
	fieldName: string,
	field: any,
	data?: any
) {
	const { format, multiple, type } = field;

	if (!data) {
		// biome-ignore lint/style/noParameterAssign: This is a generated file
		data = setTestData(chanceName, type, fieldName, format, field.choices);
	}

	eventData[fieldName] = multiple ? [data] : data;
	return eventData;
}

export function generateTestData(
	seedName: string,
	destination: DestinationDefinition<any>,
	action: ActionDefinition<any>,
	isRequiredOnly: boolean
) {
	let eventData: any = {};
	const settingsData: any = {};

	const authentication = destination.authentication;
	if (authentication) {
		for (const settingKey in authentication.fields) {
			const { format, type } = authentication.fields[settingKey];
			settingsData[settingKey] = setTestData(seedName, type, undefined, format);
		}
	}

	for (const [name, field] of Object.entries(action.fields)) {
		if (isRequiredOnly && !(field.required || name.includes('id'))) {
			continue;
		}

		const { properties } = field;

		if (properties) {
			let subData: any = {};
			let propertyFields = Object.keys(properties);

			if (isRequiredOnly) {
				propertyFields = propertyFields.filter(
					(name) => properties[name].required
				);
			}

			for (const propertyName of propertyFields) {
				const property = properties[propertyName];
				subData = setData(subData, seedName, propertyName, property);
			}

			eventData = setData(eventData, seedName, name, field, subData);
			continue;
		}

		eventData = setData(eventData, seedName, name, field);
	}

	return [eventData, settingsData];
}
