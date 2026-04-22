<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:xs="http://www.w3.org/2001/XMLSchema"
                xmlns="http://schemas.openxmlformats.org/package/2006/relationships"
                xmlns:rel="http://schemas.openxmlformats.org/package/2006/relationships"
                xmlns:x="com.elovirta.ooxml"
                version="2.0"
                exclude-result-prefixes="xs x">
  
  <xsl:param name="template.dir" as="xs:string"/>
  <xsl:param name="docx.svg.policy" as="xs:string" select="'legacy-emf'"/>
  <xsl:variable name="doc" select="document(concat($template.dir, 'word/_rels/document.xml.rels'))" as="document-node()?"/>
   
  <xsl:template match="/">
    <Relationships>
      <xsl:comment>copied</xsl:comment>
      <xsl:variable name="rels" select="$doc/rel:Relationships/rel:Relationship" as="element()*"/>
      <xsl:copy-of select="$rels except *[(:starts-with(@Target, 'header') or starts-with(@Target, 'footer') or:)
                                          @TargetMode = 'External']"/>
      <xsl:comment>hard-coded</xsl:comment>
      <xsl:if test="empty($rels[@Type = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments'])">
        <Relationship Id="rIdComments13"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
          Target="comments.xml"/>
      </xsl:if>
      <xsl:if test="empty($rels[@Type = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering'])">
        <Relationship Id="rIdNumbering2"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering"
          Target="numbering.xml"/>
      </xsl:if>
      <xsl:if test="empty($rels[@Type = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes'])">
        <Relationship Id="rIdFootnotes7"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes"
          Target="footnotes.xml"/>
      </xsl:if>
      
      <!--Relationship Id="rId8"
        Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes"
        Target="endnotes.xml"/-->
      
      <xsl:comment>images and links</xsl:comment>
      <xsl:for-each select="//@x:image-number">
        <xsl:variable name="href" select="string(../@href)" as="xs:string"/>
        <xsl:variable name="is-svg" select="matches(lower-case($href), '\.svg($|[?#])')" as="xs:boolean"/>
        <xsl:variable name="native-svg" select="$is-svg and lower-case(normalize-space($docx.svg.policy)) = 'native'" as="xs:boolean"/>
        <Relationship Id="rId{.}"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image">
          <xsl:attribute name="Target">
            <xsl:text>media/</xsl:text>
            <xsl:choose>
              <xsl:when test="$native-svg">
                <xsl:value-of select="replace($href, '\.svg([?#].*)?$', '.png')"/>
              </xsl:when>
              <xsl:when test="$is-svg">
                <xsl:value-of select="replace($href, '\.svg([?#].*)?$', '.emf')"/>
              </xsl:when>
              <xsl:otherwise>
                <xsl:value-of select="$href"/>
              </xsl:otherwise>
            </xsl:choose>
          </xsl:attribute>
        </Relationship>
        <xsl:if test="$native-svg">
          <Relationship Id="rIdSvg{.}"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
            Target="media/{$href}"/>
        </xsl:if>
      </xsl:for-each>
      
      <xsl:for-each select="//*[@x:external-link-number]">
        <Relationship Id="rIdHyperlink{@x:external-link-number}"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="{@href}"
          TargetMode="External"/>
      </xsl:for-each>
    </Relationships>
  </xsl:template>
  
</xsl:stylesheet>
