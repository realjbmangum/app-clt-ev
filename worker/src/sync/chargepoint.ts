import type { Env } from '../types';

const SOAP_ENDPOINT = 'https://webservices.chargepoint.com/webservices/chargepoint/services/5.0';
const SOAP_NS = 'urn:dictionary:com.chargepoint.webservices';
const WSSE_NS = 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd';
const SOAP_ENV_NS = 'http://schemas.xmlsoap.org/soap/envelope/';

function buildSoapEnvelope(apiKey: string, apiPassword: string, body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${SOAP_ENV_NS}" xmlns:tns="${SOAP_NS}" xmlns:wsse="${WSSE_NS}">
  <soap:Header>
    <wsse:Security>
      <wsse:UsernameToken>
        <wsse:Username>${escapeXml(apiKey)}</wsse:Username>
        <wsse:Password>${escapeXml(apiPassword)}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`;
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Simple XML text extractor — gets text content between tags
function getTagValue(xml: string, tag: string): string | null {
  const regex = new RegExp(`<(?:[a-z]+:)?${tag}[^>]*>([^<]*)<\\/(?:[a-z]+:)?${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

// Extract all repeating elements by tag name
function getAllElements(xml: string, tag: string): string[] {
  const regex = new RegExp(`<(?:[a-z]+:)?${tag}[^>]*>[\\s\\S]*?<\\/(?:[a-z]+:)?${tag}>`, 'gi');
  return xml.match(regex) || [];
}

export class ChargePointClient {
  private apiKey: string;
  private apiPassword: string;
  private r2: R2Bucket;

  constructor(env: Env) {
    this.apiKey = env.CHARGEPOINT_API_KEY || '';
    this.apiPassword = env.CHARGEPOINT_API_PASSWORD || '';
    this.r2 = env.R2;
    if (!this.apiKey || !this.apiPassword) {
      throw new Error('ChargePoint API credentials not configured (CHARGEPOINT_API_KEY and CHARGEPOINT_API_PASSWORD required)');
    }
  }

  private async soapRequest(soapAction: string, body: string): Promise<string> {
    const envelope = buildSoapEnvelope(this.apiKey, this.apiPassword, body);

    const response = await fetch(SOAP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': `urn:provider/interface/chargepointservices/${soapAction}`,
      },
      body: envelope,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`ChargePoint SOAP error ${response.status}: ${text.substring(0, 200)}`);
    }

    // Check for SOAP fault
    if (text.includes('Fault') && text.includes('faultstring')) {
      const faultMsg = getTagValue(text, 'faultstring') || 'Unknown SOAP fault';
      throw new Error(`ChargePoint SOAP fault: ${faultMsg}`);
    }

    // Archive raw response to R2
    const dateKey = new Date().toISOString().split('T')[0];
    const timeKey = new Date().toISOString().replace(/[:.]/g, '-');
    const key = `chargepoint/${dateKey}/${soapAction}_${timeKey}.xml`;
    await this.r2.put(key, text, {
      httpMetadata: { contentType: 'text/xml' },
    });

    return text;
  }

  async debugRawResponse(soapAction: string, body: string): Promise<string> {
    return this.soapRequest(soapAction, body);
  }

  async getStationStatus(): Promise<{ stationId: string; status: string; portNumber?: string }[]> {
    const body = `<tns:getStationStatus>
      <tns:searchQuery>
        <tns:orgID></tns:orgID>
      </tns:searchQuery>
    </tns:getStationStatus>`;

    const xml = await this.soapRequest('getStationStatus', body);
    const stations = getAllElements(xml, 'stationData');

    return stations.map(s => ({
      stationId: getTagValue(s, 'stationID') || '',
      status: getTagValue(s, 'Status') || getTagValue(s, 'portStatus') || getTagValue(s, 'Level') || '',
      portNumber: getTagValue(s, 'portNumber') || undefined,
    }));
  }

  async getChargingSessions(params?: {
    startTime?: string;
    endTime?: string;
  }): Promise<{
    sessionId: string;
    stationId: string;
    startTime: string;
    endTime: string;
    energy: number;
    cost: number;
    portNumber: string;
  }[]> {
    const startTime = params?.startTime || new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const endTime = params?.endTime || new Date().toISOString();

    const body = `<tns:getChargingSessionData>
      <tns:searchQuery>
        <tns:fromTimeStamp>${startTime}</tns:fromTimeStamp>
        <tns:toTimeStamp>${endTime}</tns:toTimeStamp>
      </tns:searchQuery>
    </tns:getChargingSessionData>`;

    const xml = await this.soapRequest('getChargingSessionData', body);
    const sessions = getAllElements(xml, 'ChargingSessionData');

    return sessions.map(s => ({
      sessionId: getTagValue(s, 'sessionID') || '',
      stationId: getTagValue(s, 'stationID') || '',
      startTime: getTagValue(s, 'startTime') || '',
      endTime: getTagValue(s, 'endTime') || '',
      energy: parseFloat(getTagValue(s, 'Energy') || '0'),
      cost: parseFloat(getTagValue(s, 'Energy') || '0') * 0.12, // estimate if cost not provided
      portNumber: getTagValue(s, 'portNumber') || '1',
    }));
  }

  async getTransactionData(params?: {
    startTime?: string;
    endTime?: string;
  }): Promise<any[]> {
    const startTime = params?.startTime || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endTime = params?.endTime || new Date().toISOString();

    const body = `<tns:getTransactionData>
      <tns:searchQuery>
        <tns:fromTimeStamp>${startTime}</tns:fromTimeStamp>
        <tns:toTimeStamp>${endTime}</tns:toTimeStamp>
      </tns:searchQuery>
    </tns:getTransactionData>`;

    const xml = await this.soapRequest('getTransactionData', body);
    return getAllElements(xml, 'TransactionData');
  }
}
