
!   this computes the energy and the force using the Tersoff potential   
!   PRB 39, 5566 (1989)


            subroutine pot_ter


            use common1


            implicit none

      integer        patom
      parameter      (patom=tatom)

      integer        iatom,iatom1,iatom2,w1a,w2a,w3a,w4a,
     &               w1,w2,w3,w4,i,j,k,l,ibox1,ibox2,
     &               w1b,w2b,w3b,w4b,w1c,w2c,w3c,w4c,
     &               s1,s2,s3,s1a,s2a,s1b,s2b,sign1,sign2


      real(r8_kind)  rdum,rdumx,rdumy,rdumz,edum,edump,qdum,
     &               epair,etrip,redr,
     &               fx(tatom),fy(tatom),fz(tatom),
     &               fdum,gdum,gdum2,zetaij,bij,gijk

      real(r8_kind)  fdumx,fdumy,fdumz

 
      integer        mpair,iatpair(2,tpair)

      real(r8_kind)  frij(tpair),faij(tpair),fcij(tpair),
     &               rpair(tpair),xpair(tpair),
     &               ypair(tpair),zpair(tpair)

      integer        mtrip,pa,pb,addtrip,npart(tatom),
     &               ipart(patom,tatom),ndum1,ndum2

      real(r8_kind)  xp(patom,tatom),yp(patom,tatom),
     &               zp(patom,tatom),rp(patom,tatom),
     &               fcp(patom,tatom),fap(patom,tatom),
     &               frp(patom,tatom)
      real(r8_kind)  dfcpx(patom,tatom),dfcpy(patom,tatom),
     &               dfcpz(patom,tatom)
      real(r8_kind)  dfapx(patom,tatom),dfapy(patom,tatom),
     &               dfapz(patom,tatom)
      real(r8_kind)  dfrpx(patom,tatom),dfrpy(patom,tatom),
     &               dfrpz(patom,tatom)
        
      real(r8_kind)  dot,angle

      real(r8_kind)  dfrxi(tpair),dfryi(tpair),dfrzi(tpair),
     &               dfaxi(tpair),dfayi(tpair),dfazi(tpair),
     &               dfcxi(tpair),dfcyi(tpair),dfczi(tpair)

      real(r8_kind)  dzijxi,dzijyi,dzijzi,dbijxi,dbijyi,dbijzi,
     &               dzijxj,dzijyj,dzijzj,dbijxj,dbijyj,dbijzj

      real(r8_kind)  xijt,yijt,zijt,rijt,fcijt,faijt,frijt,
     &               xikt,yikt,zikt,rikt,fcikt,faikt,frikt

      real(r8_kind)  dfcijxi,dfcijyi,dfcijzi,
     &               dfcijxj,dfcijyj,dfcijzj

      real(r8_kind)  dfaijxi,dfaijyi,dfaijzi,
     &               dfaijxj,dfaijyj,dfaijzj

      real(r8_kind)  dfrijxi,dfrijyi,dfrijzi,
     &               dfrijxj,dfrijyj,dfrijzj

      real(r8_kind)  dfcikxi,dfcikyi,dfcikzi,
     &               dfcikxk,dfcikyk,dfcikzk

      real(r8_kind)  dfaikxi,dfaikyi,dfaikzi,
     &               dfaikxk,dfaikyk,dfaikzk

      real(r8_kind)  dfrikxi,dfrikyi,dfrikzi,
     &               dfrikxk,dfrikyk,dfrikzk

      real(r8_kind)  dgxi,dgyi,dgzi,dgxj,dgyj,dgzj,
     &               dgxk,dgyk,dgzk

      real(r8_kind)  dzetaxk(patom),dzetayk(patom),dzetazk(patom)


      do i=1,natom
       npart(i)=0
       do j=1,patom
        ipart(j,i)=0
        xp(j,i)=0.0
        yp(j,i)=0.0
        zp(j,i)=0.0
        rp(j,i)=0.0
        fcp(j,i)=0.0
        fap(j,i)=0.0
        frp(j,i)=0.0
        dfcpx(j,i)=0.0
        dfcpy(j,i)=0.0
        dfcpz(j,i)=0.0
        dfapx(j,i)=0.0
        dfapy(j,i)=0.0
        dfapz(j,i)=0.0
        dfrpx(j,i)=0.0
        dfrpy(j,i)=0.0
        dfrpz(j,i)=0.0
       enddo
      enddo

	do i=1,tpair
	 frij(i)=0
	 faij(i)=0
	 fcij(i)=0
	 xpair(i)=0
	 ypair(i)=0
	 zpair(i)=0
	 rpair(i)=0
	 dfrxi(i)=0
	 dfryi(i)=0
	 dfrzi(i)=0
	 dfaxi(i)=0
	 dfayi(i)=0
	 dfazi(i)=0
	 dfcxi(i)=0
	 dfcyi(i)=0
	 dfczi(i)=0
	end do

	do j=1,tpair
	 do i=1,2
	  iatpair(i,j)=0
	 end do
	end do


            do i=1,natom
              dxfor(i)=0.0
              dyfor(i)=0.0
              dzfor(i)=0.0
            enddo

            epair=0.0
            etrip=0.0

!           constructing atom-pairs

            mpair=0

            write(20,*) 'PAIRS'
            do ibox1=1,nbox

            do iatom1=1,natbox(ibox1)-1
            do iatom2=iatom1+1,natbox(ibox1)

              w1=iatbox(iatom1,ibox1)
              w2=iatbox(iatom2,ibox1)
              s1=satom(w1)
              s2=satom(w2)

                    rdumx=(dxpos(w2)-dxpos(w1))
                    if (rdumx.gt.(totlx/2.0)) then
                      rdumx=rdumx-totlx
                    else if (rdumx.lt.-(totlx/2.0)) then
                      rdumx=rdumx+totlx
                    end if

                    rdumy=(dypos(w2)-dypos(w1))
                    if (rdumy.gt.(totly/2.0)) then
                      rdumy=rdumy-totly
                    else if (rdumy.lt.-(totly/2.0)) then
                      rdumy=rdumy+totly
                    end if

                    rdumz=(dzpos(w2)-dzpos(w1))
                    if (rdumz.gt.(totlz/2.0)) then
                      rdumz=rdumz-totlz
                    else if (rdumz.lt.-(totlz/2.0)) then
                      rdumz=rdumz+totlz
                    end if

                    rdum=(rdumx*rdumx)+(rdumy*rdumy)+(rdumz*rdumz)
                    rdum=sqrt(rdum)

                    rcutsmall=rcap(s1,s2)
                    rcut=scap(s1,s2)

                    if (rdum.lt.rcut) then         ! rcut here is Sij
                       mpair=mpair+1

                       iatpair(1,mpair)=w1
                       iatpair(2,mpair)=w2

                       xpair(mpair)=rdumx
                       ypair(mpair)=rdumy
                       zpair(mpair)=rdumz
                       rpair(mpair)=rdum

                       frij(mpair)=acap(s1,s2)*exp(-lambij(s1,s2)*rdum)
                       faij(mpair)=-bcap(s1,s2)*exp(-muij(s1,s2)*rdum)

!                      derivatives of frij and faij
                       dfrxi(mpair)=lambij(s1,s2)*frij(mpair)*rdumx/rdum
                       dfryi(mpair)=lambij(s1,s2)*frij(mpair)*rdumy/rdum
                       dfrzi(mpair)=lambij(s1,s2)*frij(mpair)*rdumz/rdum

                       dfaxi(mpair)=muij(s1,s2)*faij(mpair)*rdumx/rdum
                       dfayi(mpair)=muij(s1,s2)*faij(mpair)*rdumy/rdum
                       dfazi(mpair)=muij(s1,s2)*faij(mpair)*rdumz/rdum

                       if (rdum.lt.rcutsmall) then
                         fcij(mpair)=1.0

                         dfcxi(mpair)=0.0
                         dfcyi(mpair)=0.0
                         dfczi(mpair)=0.0

                       else
                         fdum=pi*(rdum-rcutsmall)/(rcut-rcutsmall)
                         fcij(mpair)=0.5+(0.5*cos(fdum))

                         dfcxi(mpair)=pi*rdumx*sin(fdum)/(2.0*rdum)
                         dfcxi(mpair)=dfcxi(mpair)/(rcut-rcutsmall)

                         dfcyi(mpair)=pi*rdumy*sin(fdum)/(2.0*rdum)
                         dfcyi(mpair)=dfcyi(mpair)/(rcut-rcutsmall)

                         dfczi(mpair)=pi*rdumz*sin(fdum)/(2.0*rdum)
                         dfczi(mpair)=dfczi(mpair)/(rcut-rcutsmall)
   
                       end if


        ndum1=npart(w1)+1
        npart(w1)=ndum1
        ipart(ndum1,w1)=w2
        xp(ndum1,w1)=rdumx
        yp(ndum1,w1)=rdumy
        zp(ndum1,w1)=rdumz
        rp(ndum1,w1)=rdum
        fcp(ndum1,w1)=fcij(mpair)
        fap(ndum1,w1)=faij(mpair)
        frp(ndum1,w1)=frij(mpair)
        dfcpx(ndum1,w1)=dfcxi(mpair)
        dfcpy(ndum1,w1)=dfcyi(mpair)
        dfcpz(ndum1,w1)=dfczi(mpair)
        dfapx(ndum1,w1)=dfaxi(mpair)
        dfapy(ndum1,w1)=dfayi(mpair)
        dfapz(ndum1,w1)=dfazi(mpair)
        dfrpx(ndum1,w1)=dfrxi(mpair)
        dfrpy(ndum1,w1)=dfryi(mpair)
        dfrpz(ndum1,w1)=dfrzi(mpair)

        ndum2=npart(w2)+1
        npart(w2)=ndum2
        ipart(ndum2,w2)=w1
        xp(ndum2,w2)=-rdumx
        yp(ndum2,w2)=-rdumy
        zp(ndum2,w2)=-rdumz
        rp(ndum2,w2)=rdum
        fcp(ndum2,w2)=fcij(mpair)
        fap(ndum2,w2)=faij(mpair)
        frp(ndum2,w2)=frij(mpair)
        dfcpx(ndum2,w2)=-dfcxi(mpair)
        dfcpy(ndum2,w2)=-dfcyi(mpair)
        dfcpz(ndum2,w2)=-dfczi(mpair)
        dfapx(ndum2,w2)=-dfaxi(mpair)
        dfapy(ndum2,w2)=-dfayi(mpair)
        dfapz(ndum2,w2)=-dfazi(mpair)
        dfrpx(ndum2,w2)=-dfrxi(mpair)
        dfrpy(ndum2,w2)=-dfryi(mpair)
        dfrpz(ndum2,w2)=-dfrzi(mpair)
        
!                      note that the summation here is over distinct pairs
!                      so the factor of 1/2 in Tersoff's formula is not needed.
        edum=fcij(mpair)*frij(mpair)
        epair=epair+edum

        fx(w1)=-(fcij(mpair)*dfrxi(mpair))-(dfcxi(mpair)*frij(mpair))
        fy(w1)=-(fcij(mpair)*dfryi(mpair))-(dfcyi(mpair)*frij(mpair))
        fz(w1)=-(fcij(mpair)*dfrzi(mpair))-(dfczi(mpair)*frij(mpair))

        fx(w2)=-fx(w1)
        fy(w2)=-fy(w1)
        fz(w2)=-fz(w1)


        dxfor(w1)=dxfor(w1)+fx(w1)
        dyfor(w1)=dyfor(w1)+fy(w1)
        dzfor(w1)=dzfor(w1)+fz(w1)

        dxfor(w2)=dxfor(w2)+fx(w2)
        dyfor(w2)=dyfor(w2)+fy(w2)
        dzfor(w2)=dzfor(w2)+fz(w2)
   

        end if  ! atoms within rcut

        enddo
        enddo

        enddo




!           pairs from different boxes
            do i=1,npair
             ibox1=ibxp(1,i)
             ibox2=ibxp(2,i)

            do iatom1=1,natbox(ibox1)
            do iatom2=1,natbox(ibox2)

              w1=iatbox(iatom1,ibox1)
              w2=iatbox(iatom2,ibox2)
              s1=satom(w1)
              s2=satom(w2)

                    rdumx=(dxpos(w2)-dxpos(w1))
                        rdumx=(dxpos(w2)-dxpos(w1))
                    if (rdumx.gt.(totlx/2.0)) then
                      rdumx=rdumx-totlx
                    else if (rdumx.lt.-(totlx/2.0)) then
                      rdumx=rdumx+totlx
                    end if

                    rdumy=(dypos(w2)-dypos(w1))
                    if (rdumy.gt.(totly/2.0)) then
                      rdumy=rdumy-totly
                    else if (rdumy.lt.-(totly/2.0)) then
                      rdumy=rdumy+totly
                    end if

                    rdumz=(dzpos(w2)-dzpos(w1))
                    if (rdumz.gt.(totlz/2.0)) then
                      rdumz=rdumz-totlz
                    else if (rdumz.lt.-(totlz/2.0)) then
                      rdumz=rdumz+totlz
                    end if

                    rdum=(rdumx*rdumx)+(rdumy*rdumy)+(rdumz*rdumz)
                    rdum=sqrt(rdum)

                    rcutsmall=rcap(s1,s2)
                    rcut=scap(s1,s2)

                    if (rdum.lt.rcut) then         ! rcut here is Sij
                       mpair=mpair+1

                       iatpair(1,mpair)=w1
                       iatpair(2,mpair)=w2

                       xpair(mpair)=rdumx
                       ypair(mpair)=rdumy
                       zpair(mpair)=rdumz
                       rpair(mpair)=rdum

                       frij(mpair)=acap(s1,s2)*exp(-lambij(s1,s2)*rdum)
                       faij(mpair)=-bcap(s1,s2)*exp(-muij(s1,s2)*rdum)

!                      derivatives of frij and faij
                       dfrxi(mpair)=lambij(s1,s2)*frij(mpair)*rdumx/rdum
                       dfryi(mpair)=lambij(s1,s2)*frij(mpair)*rdumy/rdum
                       dfrzi(mpair)=lambij(s1,s2)*frij(mpair)*rdumz/rdum

                       dfaxi(mpair)=muij(s1,s2)*faij(mpair)*rdumx/rdum
                       dfayi(mpair)=muij(s1,s2)*faij(mpair)*rdumy/rdum
                       dfazi(mpair)=muij(s1,s2)*faij(mpair)*rdumz/rdum

                       if (rdum.lt.rcutsmall) then
                         fcij(mpair)=1.0

                         dfcxi(mpair)=0.0
                         dfcyi(mpair)=0.0
                         dfczi(mpair)=0.0

                       else
                         fdum=pi*(rdum-rcutsmall)/(rcut-rcutsmall)
                         fcij(mpair)=0.5+(0.5*cos(fdum))

                         dfcxi(mpair)=pi*rdumx*sin(fdum)/(2.0*rdum)
                         dfcxi(mpair)=dfcxi(mpair)/(rcut-rcutsmall)

                         dfcyi(mpair)=pi*rdumy*sin(fdum)/(2.0*rdum)
                         dfcyi(mpair)=dfcyi(mpair)/(rcut-rcutsmall)

                         dfczi(mpair)=pi*rdumz*sin(fdum)/(2.0*rdum)
                         dfczi(mpair)=dfczi(mpair)/(rcut-rcutsmall)
   
                       end if


        ndum1=npart(w1)+1
        npart(w1)=ndum1
        ipart(ndum1,w1)=w2
        xp(ndum1,w1)=rdumx
        yp(ndum1,w1)=rdumy
        zp(ndum1,w1)=rdumz
        rp(ndum1,w1)=rdum
        fcp(ndum1,w1)=fcij(mpair)
        fap(ndum1,w1)=faij(mpair)
        frp(ndum1,w1)=frij(mpair)
        dfcpx(ndum1,w1)=dfcxi(mpair)
        dfcpy(ndum1,w1)=dfcyi(mpair)
        dfcpz(ndum1,w1)=dfczi(mpair)
        dfapx(ndum1,w1)=dfaxi(mpair)
        dfapy(ndum1,w1)=dfayi(mpair)
        dfapz(ndum1,w1)=dfazi(mpair)
        dfrpx(ndum1,w1)=dfrxi(mpair)
        dfrpy(ndum1,w1)=dfryi(mpair)
        dfrpz(ndum1,w1)=dfrzi(mpair)

        ndum2=npart(w2)+1
        npart(w2)=ndum2
        ipart(ndum2,w2)=w1
        xp(ndum2,w2)=-rdumx
        yp(ndum2,w2)=-rdumy
        zp(ndum2,w2)=-rdumz
        rp(ndum2,w2)=rdum
        fcp(ndum2,w2)=fcij(mpair)
        fap(ndum2,w2)=faij(mpair)
        frp(ndum2,w2)=frij(mpair)
        dfcpx(ndum2,w2)=-dfcxi(mpair)
        dfcpy(ndum2,w2)=-dfcyi(mpair)
        dfcpz(ndum2,w2)=-dfczi(mpair)
        dfapx(ndum2,w2)=-dfaxi(mpair)
        dfapy(ndum2,w2)=-dfayi(mpair)
        dfapz(ndum2,w2)=-dfazi(mpair)
        dfrpx(ndum2,w2)=-dfrxi(mpair)
        dfrpy(ndum2,w2)=-dfryi(mpair)
        dfrpz(ndum2,w2)=-dfrzi(mpair)
        
!                      note that the summation here is over distinct pairs
!                      so the factor of 1/2 in Tersoff's formula is not needed.
        edum=fcij(mpair)*frij(mpair)
        epair=epair+edum

        fx(w1)=-(fcij(mpair)*dfrxi(mpair))-(dfcxi(mpair)*frij(mpair))
        fy(w1)=-(fcij(mpair)*dfryi(mpair))-(dfcyi(mpair)*frij(mpair))
        fz(w1)=-(fcij(mpair)*dfrzi(mpair))-(dfczi(mpair)*frij(mpair))

        fx(w2)=-fx(w1)
        fy(w2)=-fy(w1)
        fz(w2)=-fz(w1)


        dxfor(w1)=dxfor(w1)+fx(w1)
        dyfor(w1)=dyfor(w1)+fy(w1)
        dzfor(w1)=dzfor(w1)+fz(w1)

        dxfor(w2)=dxfor(w2)+fx(w2)
        dyfor(w2)=dyfor(w2)+fy(w2)
        dzfor(w2)=dzfor(w2)+fz(w2)

        end if  ! atoms within rcut


            enddo
            enddo

            enddo



         
            mtrip=0
 

            write(20,*) 'TRIPS'

            do pa=1,mpair


!           first orientation of pair first atom as central atom           
              w1=iatpair(1,pa)      ! w1 is atom i
              w2=iatpair(2,pa)      ! w2 is atom j
              s1=satom(w1) 
              s2=satom(w2)

              xijt=xpair(pa)
              yijt=ypair(pa)
              zijt=zpair(pa)
              rijt=rpair(pa)
              fcijt=fcij(pa)
              faijt=faij(pa)
              frijt=frij(pa)

              dfcijxi=dfcxi(pa)
              dfcijyi=dfcyi(pa)
              dfcijzi=dfczi(pa)
              dfcijxj=-dfcijxi
              dfcijyj=-dfcijyi
              dfcijzj=-dfcijzi

              dfaijxi=dfaxi(pa)
              dfaijyi=dfayi(pa)
              dfaijzi=dfazi(pa)
              dfaijxj=-dfaijxi
              dfaijyj=-dfaijyi
              dfaijzj=-dfaijzi

              dfrijxi=dfrxi(pa)
              dfrijyi=dfryi(pa)
              dfrijzi=dfrzi(pa)
              dfrijxj=-dfrijxi
              dfrijyj=-dfrijyi
              dfrijzj=-dfrijzi

              zetaij=0.0
              dzijxi=0.0
              dzijyi=0.0
              dzijzi=0.0
              dzijxj=0.0
              dzijyj=0.0
              dzijzj=0.0

              do pb=1,patom
               dzetaxk(pb)=0.0
               dzetayk(pb)=0.0
               dzetazk(pb)=0.0
              enddo

              do pb=1,natom
               fx(pb)=0.0
               fy(pb)=0.0
               fz(pb)=0.0
              enddo

              fdumx=0.0
              fdumy=0.0
              fdumz=0.0

              do pb=1,npart(w1)
                
                w3=ipart(pb,w1)
                s3=satom(w3)
                if (w3.ne.w2) then

                xikt=xp(pb,w1)
                yikt=yp(pb,w1)
                zikt=zp(pb,w1)
                rikt=rp(pb,w1)
                fcikt=fcp(pb,w1)
                faikt=fap(pb,w1)
                frikt=frp(pb,w1)

                dfcikxi=dfcpx(pb,w1)
                dfcikyi=dfcpy(pb,w1)
                dfcikzi=dfcpz(pb,w1)
                dfcikxk=-dfcikxi
                dfcikyk=-dfcikyi
                dfcikzk=-dfcikzi

                dfaikxi=dfapx(pb,w1)
                dfaikyi=dfapy(pb,w1)
                dfaikzi=dfapz(pb,w1)
                dfaikxk=-dfaikxi
                dfaikyk=-dfaikyi
                dfaikzk=-dfaikzi

                dfrikxi=dfrpx(pb,w1)
                dfrikyi=dfrpy(pb,w1)
                dfrikzi=dfrpz(pb,w1)
                dfrikxk=-dfrikxi
                dfrikyk=-dfrikyi
                dfrikzk=-dfrikzi

                dot=(xijt*xikt)
     &             +(yijt*yikt)
     &             +(zijt*zikt)
                angle=dot/(rijt*rikt)     ! angle is cosine(theta_jik)

                gdum=(d(s1)**2)+((h(s1)-angle)**2)
                gdum2=(c(s1)**2)/(gdum*gdum)
                gdum=(c(s1)**2)/gdum
                gijk=1.0+((c(s1)/d(s1))**2)-gdum

                gdum2=-2.0*gdum2*(h(s1)-angle)

                dgxj=(xikt/(rijt*rikt))
     &              -(angle*xijt/(rijt**2))
                dgxj=dgxj*gdum2

                dgyj=(yikt/(rijt*rikt))
     &              -(angle*yijt/(rijt**2))
                dgyj=dgyj*gdum2

                dgzj=(zikt/(rijt*rikt))
     &              -(angle*zijt/(rijt**2))
                dgzj=dgzj*gdum2

                dgxk=(xijt/(rijt*rikt))
     &              -(angle*xikt/(rikt**2))
                dgxk=dgxk*gdum2

                dgyk=(yijt/(rijt*rikt))
     &              -(angle*yikt/(rikt**2))
                dgyk=dgyk*gdum2

                dgzk=(zijt/(rijt*rikt))
     &              -(angle*zikt/(rikt**2))
                dgzk=dgzk*gdum2

                dgxi=-dgxj-dgxk
                dgyi=-dgyj-dgyk
                dgzi=-dgzj-dgzk

                zetaij=zetaij+(fcikt*omega(s1,s3)*gijk)

                dzijxi=dzijxi+(dfcikxi*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgxi)
                dzijyi=dzijyi+(dfcikyi*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgyi)
                dzijzi=dzijzi+(dfcikzi*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgzi)

                dzijxj=dzijxj+(fcikt*omega(s1,s3)*dgxj)
                dzijyj=dzijyj+(fcikt*omega(s1,s3)*dgyj)
                dzijzj=dzijzj+(fcikt*omega(s1,s3)*dgzj)

                dzetaxk(pb)=(dfcikxk*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgxk)
                dzetayk(pb)=(dfcikyk*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgyk)
                dzetazk(pb)=(dfcikzk*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgzk)

                end if      !    w2 ne w3
              enddo         !   looping over partners of w1        


         bij=(1.0+((beta(s1)*zetaij)**nexp(s1)))**(-0.5/nexp(s1))
         bij=chi(s1,s2)*bij

         fdum=(beta(s1)*zetaij)**nexp(s1)
         fdum=-0.5*chi(s1,s2)*((1.0+fdum)**(-1.0-(0.5/nexp(s1))))
     &                   *fdum/zetaij

         dbijxi=fdum*dzijxi
         dbijyi=fdum*dzijyi
         dbijzi=fdum*dzijzi
      
         dbijxj=fdum*dzijxj
         dbijyj=fdum*dzijyj
         dbijzj=fdum*dzijzj
 
         edum=0.5*fcijt*bij*faijt     
                            ! Tersoff's factor
                            ! of 1/2 needed here because bond ij
                            ! is counted once with i at center
                            ! and once with j at center

         etrip=etrip+edum


         fx(w1)=-(fcijt*bij*dfaijxi)
     &          -(faijt*bij*dfcijxi)
     &          -(fcijt*faijt*dbijxi)

         fy(w1)=-(fcijt*bij*dfaijyi)
     &          -(faijt*bij*dfcijyi)
     &          -(fcijt*faijt*dbijyi)

         fz(w1)=-(fcijt*bij*dfaijzi)
     &          -(faijt*bij*dfcijzi)
     &          -(fcijt*faijt*dbijzi)

         fx(w2)=-(fcijt*bij*dfaijxj)
     &          -(faijt*bij*dfcijxj)
     &          -(fcijt*faijt*dbijxj)

         fy(w2)=-(fcijt*bij*dfaijyj)
     &          -(faijt*bij*dfcijyj)
     &          -(fcijt*faijt*dbijyj)

         fz(w2)=-(fcijt*bij*dfaijzj)
     &          -(faijt*bij*dfcijzj)
     &          -(fcijt*faijt*dbijzj)

         dxfor(w1)=dxfor(w1)+(fx(w1)*0.5)
         dyfor(w1)=dyfor(w1)+(fy(w1)*0.5)
         dzfor(w1)=dzfor(w1)+(fz(w1)*0.5)

         dxfor(w2)=dxfor(w2)+(fx(w2)*0.5)
         dyfor(w2)=dyfor(w2)+(fy(w2)*0.5)
         dzfor(w2)=dzfor(w2)+(fz(w2)*0.5)

!    computing forces on each w3
         fdum=(beta(s1)*zetaij)**nexp(s1)
         fdum=-0.5*chi(s1,s2)*((1.0+fdum)**(-1.0-(0.5/nexp(s1))))
     &                   *fdum/zetaij

              do pb=1,npart(w1)
                w3=ipart(pb,w1)
                s3=satom(w3)

                if (w3.ne.w2) then
                  fx(w3)=-fcijt*faijt*fdum*dzetaxk(pb)                  
                  fy(w3)=-fcijt*faijt*fdum*dzetayk(pb)                  
                  fz(w3)=-fcijt*faijt*fdum*dzetazk(pb)                  
                  dxfor(w3)=dxfor(w3)+(0.5*fx(w3))
                  dyfor(w3)=dyfor(w3)+(0.5*fy(w3))
                  dzfor(w3)=dzfor(w3)+(0.5*fz(w3))
               end if      !    w2 ne w3
              enddo         !   looping over partners of w1        

         call flush(20)



!           second orientation of pair second atom as central atom           
              w2=iatpair(1,pa)      ! w2 is atom j
              w1=iatpair(2,pa)      ! w1 is atom i
              s1=satom(w1) 
              s2=satom(w2)

              xijt=-xpair(pa)
              yijt=-ypair(pa)
              zijt=-zpair(pa)
              rijt=rpair(pa)
              fcijt=fcij(pa)
              faijt=faij(pa)
              frijt=frij(pa)

              dfcijxi=-dfcxi(pa)
              dfcijyi=-dfcyi(pa)
              dfcijzi=-dfczi(pa)
              dfcijxj=-dfcijxi
              dfcijyj=-dfcijyi
              dfcijzj=-dfcijzi

              dfaijxi=-dfaxi(pa)
              dfaijyi=-dfayi(pa)
              dfaijzi=-dfazi(pa)
              dfaijxj=-dfaijxi
              dfaijyj=-dfaijyi
              dfaijzj=-dfaijzi

              dfrijxi=-dfrxi(pa)
              dfrijyi=-dfryi(pa)
              dfrijzi=-dfrzi(pa)
              dfrijxj=-dfrijxi
              dfrijyj=-dfrijyi
              dfrijzj=-dfrijzi

              zetaij=0.0
              dzijxi=0.0
              dzijyi=0.0
              dzijzi=0.0
              dzijxj=0.0
              dzijyj=0.0
              dzijzj=0.0

              do pb=1,natom
               fx(pb)=0.0
               fy(pb)=0.0
               fz(pb)=0.0
              enddo

              do pb=1,patom
               dzetaxk(pb)=0.0
               dzetayk(pb)=0.0
               dzetazk(pb)=0.0
              enddo

              fdumx=0.0
              fdumy=0.0
              fdumz=0.0

              do pb=1,npart(w1)
                
                w3=ipart(pb,w1)
                s3=satom(w3)
                if (w3.ne.w2) then

                xikt=xp(pb,w1)
                yikt=yp(pb,w1)
                zikt=zp(pb,w1)
                rikt=rp(pb,w1)
                fcikt=fcp(pb,w1)
                faikt=fap(pb,w1)
                frikt=frp(pb,w1)

                dfcikxi=dfcpx(pb,w1)
                dfcikyi=dfcpy(pb,w1)
                dfcikzi=dfcpz(pb,w1)
                dfcikxk=-dfcikxi
                dfcikyk=-dfcikyi
                dfcikzk=-dfcikzi

                dfaikxi=dfapx(pb,w1)
                dfaikyi=dfapy(pb,w1)
                dfaikzi=dfapz(pb,w1)
                dfaikxk=-dfaikxi
                dfaikyk=-dfaikyi
                dfaikzk=-dfaikzi

                dfrikxi=dfrpx(pb,w1)
                dfrikyi=dfrpy(pb,w1)
                dfrikzi=dfrpz(pb,w1)
                dfrikxk=-dfrikxi
                dfrikyk=-dfrikyi
                dfrikzk=-dfrikzi

                dot=(xijt*xikt)
     &             +(yijt*yikt)
     &             +(zijt*zikt)
                angle=dot/(rijt*rikt)     ! angle is cosine(theta_jik)

                gdum=(d(s1)**2)+((h(s1)-angle)**2)
                gdum2=(c(s1)**2)/(gdum*gdum)
                gdum=(c(s1)**2)/gdum
                gijk=1.0+((c(s1)/d(s1))**2)-gdum

                gdum2=-2.0*gdum2*(h(s1)-angle)

                dgxj=(xikt/(rijt*rikt))
     &              -(angle*xijt/(rijt**2))
                dgxj=dgxj*gdum2

                dgyj=(yikt/(rijt*rikt))
     &              -(angle*yijt/(rijt**2))
                dgyj=dgyj*gdum2

                dgzj=(zikt/(rijt*rikt))
     &              -(angle*zijt/(rijt**2))
                dgzj=dgzj*gdum2

                dgxk=(xijt/(rijt*rikt))
     &              -(angle*xikt/(rikt**2))
                dgxk=dgxk*gdum2

                dgyk=(yijt/(rijt*rikt))
     &              -(angle*yikt/(rikt**2))
                dgyk=dgyk*gdum2

                dgzk=(zijt/(rijt*rikt))
     &              -(angle*zikt/(rikt**2))
                dgzk=dgzk*gdum2


                dgxi=-dgxj-dgxk
                dgyi=-dgyj-dgyk
                dgzi=-dgzj-dgzk


                zetaij=zetaij+(fcikt*omega(s1,s3)*gijk)

                dzijxi=dzijxi+(dfcikxi*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgxi)
                dzijyi=dzijyi+(dfcikyi*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgyi)
                dzijzi=dzijzi+(dfcikzi*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgzi)

                dzijxj=dzijxj+(fcikt*omega(s1,s3)*dgxj)
                dzijyj=dzijyj+(fcikt*omega(s1,s3)*dgyj)
                dzijzj=dzijzj+(fcikt*omega(s1,s3)*dgzj)

                dzetaxk(pb)=(dfcikxk*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgxk)
                dzetayk(pb)=(dfcikyk*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgyk)
                dzetazk(pb)=(dfcikzk*omega(s1,s3)*gijk)
     &                       +(fcikt*omega(s1,s3)*dgzk)

                end if      !    w2 ne w3
              enddo         !   looping over partners of w1        


         bij=(1.0+((beta(s1)*zetaij)**nexp(s1)))**(-0.5/nexp(s1))
         bij=chi(s1,s2)*bij

         fdum=(beta(s1)*zetaij)**nexp(s1)
         fdum=-0.5*chi(s1,s2)*((1.0+fdum)**(-1.0-(0.5/nexp(s1))))
     &                   *fdum/zetaij

         dbijxi=fdum*dzijxi
         dbijyi=fdum*dzijyi
         dbijzi=fdum*dzijzi
      
         dbijxj=fdum*dzijxj
         dbijyj=fdum*dzijyj
         dbijzj=fdum*dzijzj
 
         edum=0.5*fcijt*bij*faijt     
                            ! Tersoff's factor
                            ! of 1/2 needed here because bond ij
                            ! is counted once with i at center
                            ! and once with j at center

         etrip=etrip+edum

 
         fx(w1)=-(fcijt*bij*dfaijxi)
     &          -(faijt*bij*dfcijxi)
     &          -(fcijt*faijt*dbijxi)

         fy(w1)=-(fcijt*bij*dfaijyi)
     &          -(faijt*bij*dfcijyi)
     &          -(fcijt*faijt*dbijyi)

         fz(w1)=-(fcijt*bij*dfaijzi)
     &          -(faijt*bij*dfcijzi)
     &          -(fcijt*faijt*dbijzi)

         fx(w2)=-(fcijt*bij*dfaijxj)
     &          -(faijt*bij*dfcijxj)
     &          -(fcijt*faijt*dbijxj)

         fy(w2)=-(fcijt*bij*dfaijyj)
     &          -(faijt*bij*dfcijyj)
     &          -(fcijt*faijt*dbijyj)

         fz(w2)=-(fcijt*bij*dfaijzj)
     &          -(faijt*bij*dfcijzj)
     &          -(fcijt*faijt*dbijzj)

         dxfor(w1)=dxfor(w1)+(0.5*fx(w1))
         dyfor(w1)=dyfor(w1)+(0.5*fy(w1))
         dzfor(w1)=dzfor(w1)+(0.5*fz(w1))

         dxfor(w2)=dxfor(w2)+(0.5*fx(w2))
         dyfor(w2)=dyfor(w2)+(0.5*fy(w2))
         dzfor(w2)=dzfor(w2)+(0.5*fz(w2))

!    computing forces on each w3
         fdum=(beta(s1)*zetaij)**nexp(s1)
!              Tersoff's factor of 1/2 taken care of here
         fdum=-0.5*chi(s1,s2)*((1.0+fdum)**(-1.0-(0.5/nexp(s1))))
     &                   *fdum/zetaij

              do pb=1,npart(w1)
                w3=ipart(pb,w1)
                s3=satom(w3)

                if (w3.ne.w2) then
                  fx(w3)=-fcijt*faijt*fdum*dzetaxk(pb)                  
                  fy(w3)=-fcijt*faijt*fdum*dzetayk(pb)                  
                  fz(w3)=-fcijt*faijt*fdum*dzetazk(pb)                  
                  dxfor(w3)=dxfor(w3)+(0.5*fx(w3))
                  dyfor(w3)=dyfor(w3)+(0.5*fy(w3))
                  dzfor(w3)=dzfor(w3)+(0.5*fz(w3))
               end if      !    w2 ne w3
              enddo         !   looping over partners of w1        


         call flush(20)



         enddo         ! loop over pa

         e2=epair
         e3=etrip


         return
         end subroutine pot_ter
