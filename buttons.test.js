const btoa = require('btoa');
const fetch = require('node-fetch');
const config = require('./config');
const buttons = require('./buttons');

jest.setTimeout(10000);

const buildData = (token, type, payload) => {
  if (!payload) {
    payload = {};
  }
  const data = {
    type,
    token,
    challenge: 'challenge', 
    body: btoa('payload=' + JSON.stringify(payload)),
  };
  return data;
};

const buildPayload = (token, teamId, userId, action) => {
  const payload = {
    token,
    team: {
      id: teamId,
    },
    user: {
      id: userId || 'test',
    },
    original_message: {
      attachments: [
        {
          title_link: 'Test',
        },
      ],
    },
    actions: [action]
  };
  return payload;
};

const sleep = (s) => {
  return new Promise(resolve => setTimeout(resolve, s * 1000));
};

const buildRandomString = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const callCheckApi = async (path, params) => {
  let querystring = [];
  for (let key in params) {
    querystring.push(key + '=' + params[key]);
  }
  if (querystring.length > 0) {
    querystring = '?' + querystring.join('&');
  }
  else {
    querystring = '';
  }
  let url = config.checkApi.url + '/test/' + path + querystring;
  const res = await fetch(url);
  const json = await res.json();
  return json;
};

const sendAction = async (action) => {
  let uuid = buildRandomString();
  const payload = buildPayload('123456abcdef', 'T12345ABC', uuid, action);
  const data = buildData('123456abcdef', 'process', payload);
  const callback = jest.fn();

  let outputData = '';
  storeLog = inputs => (outputData += inputs);
  console['log'] = jest.fn(storeLog);

  let token = buildRandomString();
  await callCheckApi('new_api_key', { access_token: config.checkApi.apiKey });
  await callCheckApi('user', { provider: 'slack', uuid, token });

  buttons.handler(data, null, callback);
  await sleep(3);

  return { outputData, callback };
};

test('verify call if team is in config', () => {
  const data = buildData('123456abcdef', 'url_verification');
  const callback = jest.fn();
  buttons.handler(data, null, callback);
  expect(callback).toHaveBeenCalledWith(null, 'challenge'); 
});

test('does not verify call if team is not in config', () => {
  const data = buildData('notinconfig', 'url_verification');
  const callback = jest.fn();
  buttons.handler(data, null, callback);
  expect(callback).toHaveBeenCalledWith('Verification failed');
});

test('does not process call if verification token is not valid', () => {
  const payload = buildPayload('invalid', 'T12345ABC');
  const data = buildData('invalid', 'process', payload);
  const callback = jest.fn();
  buttons.handler(data, null, callback);
  expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ text: expect.stringContaining('do not have the permission') }))
});

test('return error if Slack user cannot be identified', async () => {
  const payload = buildPayload('123456abcdef', 'T12345ABC', 'invalid');
  const data = buildData('123456abcdef', 'process', payload);
  const callback = jest.fn();

  let outputData = '';
  storeLog = inputs => (outputData += inputs);
  console['log'] = jest.fn(storeLog);

  buttons.handler(data, null, callback);
  await sleep(3);
  expect(outputData).toMatch('Error when trying to identify Slack user');
  expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ text: expect.stringContaining('do not have the permission') }))
});

test('identify Slack user and handle invalid action', async () => {
  const { outputData, callback } = await sendAction({ name: 'test' });
  expect(outputData).toMatch('Successfully identified as Slack user with token: ');
  expect(outputData).toMatch('Unknown action: test');
  expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ text: expect.stringContaining('do not have the permission') }))
});

test('identify Slack user and handle type_comment command', async () => {
  const { outputData, callback } = await sendAction({ name: 'type_comment' });
  expect(outputData).toMatch('Successfully identified as Slack user with token: ');
  expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ text: expect.stringContaining('type your comment') }))
});

test('identify Slack user and handle type_title command', async () => {
  const { outputData, callback } = await sendAction({ name: 'edit', selected_options: [{ value: 'type_title' }] });
  expect(outputData).toMatch('Successfully identified as Slack user with token: ');
  expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ text: expect.stringContaining('type the new title') }))
});

test('identify Slack user and handle type_description command', async () => {
  const { outputData, callback } = await sendAction({ name: 'edit', selected_options: [{ value: 'type_description' }] });
  expect(outputData).toMatch('Successfully identified as Slack user with token: ');
  expect(callback).toHaveBeenCalledWith(null, expect.objectContaining({ text: expect.stringContaining('type the new description') }))
});
