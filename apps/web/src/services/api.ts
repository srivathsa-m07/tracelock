import axios from 'axios';

const client = axios.create({ baseURL: 'http://127.0.0.1:3000' });

export default {
  async getScans({ page, limit }: { page: number; limit: number }) {
    const res = await client.get('/scans', { params: { page, limit } });
    return res.data;
  },
  async getScan(scanId: string) {
    const res = await client.get(`/scans/${scanId}`);
    return res.data;
  },
  async getRiskSummary(scanId: string) {
    const res = await client.get(`/scans/${scanId}/risk-summary`);
    return res.data;
  },
  async uploadPackageJson(file: File, onProgress?: (pct: number) => void) {
    const form = new FormData();
    form.append('file', file);
    const res = await client.post('/scan/package-json', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return res.data;
  },
  async uploadLockfiles(files: File[], onProgress?: (pct: number) => void) {
    const form = new FormData();
    files.forEach((f) => form.append('lockfile', f));
    const res = await client.post('/scan/package-json', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
      },
    });
    return res.data;
  },
  async getScanDependencyTree(scanId: string) {
    const res = await client.get(`/scans/${scanId}/dependency-tree`);
    return res.data;
  },
  async getScanSbomCyclone(scanId: string) {
    const res = await client.get(`/scans/${scanId}/sbom/cyclonedx`, { responseType: 'json' });
    return res.data;
  },
  async getScanSbomSpdx(scanId: string) {
    const res = await client.get(`/scans/${scanId}/sbom/spdx`, { responseType: 'json' });
    return res.data;
  },
  async getPrioritizedRisks(scanId: string) {
    const res = await client.get(`/scans/${scanId}/prioritized-risks`);
    return res.data;
  },
  async getAnalyticsTrends() {
    const res = await client.get('/analytics/trends');
    return res.data;
  },
  async getAnalyticsPosture() {
    const res = await client.get('/analytics/security-posture');
    return res.data;
  },
  async getAnalyticsVulnHistory() {
    const res = await client.get('/analytics/vulnerability-history');
    return res.data;
  },
  async getRepositories() {
    const res = await client.get('/repositories');
    return res.data;
  },
  async getRepository(id: string) {
    const res = await client.get(`/repositories/${id}`);
    return res.data;
  },
  async createRepository(body: { name: string; description?: string }) {
    const res = await client.post('/repositories', body);
    return res.data;
  },
  async getRepositoryAnalytics(id: string) {
    const res = await client.get(`/repositories/${id}/analytics`);
    return res.data;
  },


  async getScanVulnerabilities(scanId: string) {
    const res = await client.get(`/scans/${scanId}/vulnerabilities`);
    return res.data;
  },
  async getDependencyVulnerabilities(dependencyId: string) {
    const res = await client.get(`/dependencies/${dependencyId}/vulnerabilities`);
    return res.data;
  },
  async getScanAttackPaths(scanId: string) {
    const res = await client.get(`/scans/${scanId}/attack-paths`);
    return res.data;
  },
  async getDependencyBlastRadius(dependencyId: string) {
    const res = await client.get(`/dependencies/${dependencyId}/blast-radius`);
    return res.data;
  },
  async getDependencyPropagation(dependencyId: string) {
    const res = await client.get(`/dependencies/${dependencyId}/propagation-analysis`);
    return res.data;
  },
};
