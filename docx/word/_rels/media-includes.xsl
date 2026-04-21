<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns:rel="http://schemas.openxmlformats.org/package/2006/relationships"
                exclude-result-prefixes="xs rel"
                version="2.0">

  <xsl:output method="text" encoding="UTF-8"/>

  <xsl:template match="/">
    <xsl:for-each select="//rel:Relationship[@Type = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image'][starts-with(@Target, 'media/')]">
      <xsl:value-of select="substring-after(@Target, 'media/')"/>
      <xsl:text>&#10;</xsl:text>
    </xsl:for-each>
  </xsl:template>

</xsl:stylesheet>
