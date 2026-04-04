/**
 * Onboarding module for Veloquent initialization APIs.
 * @module modules/onboarding
 */

/**
 * Onboarding module - create superuser and check initialization state
 * @class
 */
export class Onboarding {
  /**
   * @param {import('../core/request.js').RequestHelper} requestHelper
   */
  constructor(requestHelper) {
    this.requestHelper = requestHelper
  }

  /**
   * Check whether the superuser account has been created.
   * @returns {Promise<boolean>}
   */
  async initialized() {
    const result = await this.requestHelper.execute({
      method: 'POST',
      path: '/onboarding/initialized'
    })

    return result.data
  }

  /**
   * Create the initial superuser.
   * @param {Object} data
   * @param {string} data.name
   * @param {string} data.email
   * @param {string} data.password
   * @returns {Promise<Object>} Created superuser payload
   */
  async createSuperuser(data) {
    const result = await this.requestHelper.execute({
      method: 'POST',
      path: '/onboarding/superuser',
      body: data
    })

    return result.data
  }
}
